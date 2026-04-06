import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_MAINTENANCE_MESSAGE =
  'Ventana de mantenimiento automatizada para validar acceso exclusivo del rol SISTEMAS.';
const DEFAULT_SUPERVISOR_DNI = '11111111';
const DEFAULT_SUPERVISOR_PASSWORD = '45TR37hn';

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function parseDotEnv(content) {
  return content.split(/\r?\n/).reduce((accumulator, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      return accumulator;
    }

    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

async function loadEnvFile(relativePath) {
  try {
    const fullPath = path.join(repoRoot, relativePath);
    const content = await fs.readFile(fullPath, 'utf8');
    return parseDotEnv(content);
  } catch {
    return {};
  }
}

function resolveEnv(localEnv, key, fallback = '') {
  return process.env[key] || localEnv[key] || fallback;
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildUrl(baseUrl, pathname, query) {
  const normalizedBase = String(baseUrl).replace(/\/+$/, '');
  const normalizedPath = String(pathname).startsWith('/')
    ? String(pathname)
    : `/${pathname}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url;
}

function unwrapPayload(payload) {
  if (
    payload
    && typeof payload === 'object'
    && 'success' in payload
    && 'data' in payload
  ) {
    return payload.data;
  }

  return payload;
}

async function requestJson(baseUrl, pathname, options = {}) {
  const {
    method = 'GET',
    token,
    body,
    query,
    allowStatuses = [],
  } = options;

  const response = await fetch(buildUrl(baseUrl, pathname, query), {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok && !allowStatuses.includes(response.status)) {
    const reason = typeof payload === 'object' && payload
      ? payload.message || payload.error || JSON.stringify(payload)
      : text || response.statusText;
    throw new Error(`${method} ${pathname} -> ${response.status} ${reason}`);
  }

  return {
    status: response.status,
    ok: response.ok,
    raw: payload,
    data: unwrapPayload(payload),
  };
}

function normalizeContractRequest(contract, overrides = {}) {
  const config = contract?.system_config || {};
  const shifts = Array.isArray(contract?.shifts) ? contract.shifts : [];

  return {
    system_config: {
      plant_name: config.plantName,
      auto_logout_minutes: config.autoLogoutMinutes,
      password_expiry_warning_days: config.passwordExpiryWarningDays,
      password_policy_days: config.passwordPolicyDays,
      operator_message: config.operatorMessage,
      timezone_name: config.timezoneName,
      maintenance_mode_enabled: config.maintenanceModeEnabled,
      maintenance_message: config.maintenanceMessage,
      offline_retention_days: config.offlineRetentionDays,
      backup_frequency: config.backupFrequency,
      conflict_resolution_policy: config.conflictResolutionPolicy,
      production_assistant_message: config.productionAssistantMessage,
      finishing_manager_message: config.finishingManagerMessage,
      management_message: config.managementMessage,
      failed_login_alert_mode: config.failedLoginAlertMode,
      failed_login_max_attempts: config.failedLoginMaxAttempts,
      ot_allow_partial_close: config.otAllowPartialClose,
      ot_allow_close_with_waste: config.otAllowCloseWithWaste,
      ot_allow_forced_close: config.otAllowForcedClose,
      ot_forced_close_requires_reason: config.otForcedCloseRequiresReason,
      ...overrides.system_config,
    },
    shifts: shifts.map((shift) => ({
      code: shift.code,
      name: shift.name,
      start_time: /^\d{2}:\d{2}:\d{2}$/.test(String(shift.start_time || shift.startTime || ''))
        ? String(shift.start_time || shift.startTime)
        : `${String(shift.startTime || shift.start_time || '00:00').slice(0, 5)}:00`,
      end_time: /^\d{2}:\d{2}:\d{2}$/.test(String(shift.end_time || shift.endTime || ''))
        ? String(shift.end_time || shift.endTime)
        : `${String(shift.endTime || shift.end_time || '00:00').slice(0, 5)}:00`,
      crosses_midnight: Boolean(shift.crosses_midnight),
      active: shift.active !== false,
    })),
  };
}

function logStep(label, detail = '') {
  process.stdout.write(`[maintenance-smoke] ${label}${detail ? `: ${detail}` : ''}\n`);
}

async function requirePlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error(
      'No se encontró la dependencia "playwright". Ejecuta: npm i -D playwright && npx playwright install chromium',
    );
  }
}

async function apiLogin(apiBaseUrl, username, password, deviceName) {
  const response = await requestJson(apiBaseUrl, '/auth/login', {
    method: 'POST',
    body: {
      username,
      password,
      deviceName,
      deviceType: 'DESKTOP',
      deviceProfile: 'MAINTENANCE_SMOKE',
    },
  });

  invariant(response.data?.accessToken, `El login API para ${username} no devolvió accessToken.`);
  return response.data;
}

async function loginFromUi(page, username, password, shiftCode = 'T1') {
  await page.goto('/#/login', { waitUntil: 'networkidle' });
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator(`button[type="button"]`).nth(shiftCode === 'T2' ? 1 : 0).click();
  await page.locator('button[type="submit"]').click();
}

async function expectToast(page, message) {
  await page.waitForSelector('app-notification-center article', { timeout: 10_000 });
  const toastText = await page.locator('app-notification-center').textContent();
  invariant(
    String(toastText || '').includes(message),
    `No apareció el toast esperado. Esperado: "${message}". Recibido: "${toastText || ''}"`,
  );
}

async function expectLoginMaintenanceBanner(page, message) {
  await page.goto('/#/login', { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('text=Modo mantenimiento global', { timeout: 10_000 });
  } catch {
    const content = await page.textContent('body');
    const excerpt = String(content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    throw new Error(`El login no renderizó el banner de mantenimiento. Contenido visible: ${excerpt}`);
  }
  const content = await page.textContent('body');
  invariant(String(content || '').includes(message), 'El login no mostró el mensaje de mantenimiento esperado.');
  invariant(
    String(content || '').includes('SISTEMA: EN MANTENIMIENTO'),
    'El login no mostró el badge superior de mantenimiento.',
  );
}

async function expectRouteContains(page, fragment, timeout = 15_000) {
  await page.waitForFunction((expected) => window.location.hash.includes(expected), fragment, { timeout });
}

async function expectRouteNotContains(page, fragment, timeout = 15_000) {
  await page.waitForFunction((expected) => !window.location.hash.includes(expected), fragment, { timeout });
}

async function main() {
  const rootEnv = await loadEnvFile('.env');
  const backendEnv = await loadEnvFile(path.join('backend', '.env'));
  const localEnv = { ...rootEnv, ...backendEnv };

  const frontendPort = resolveEnv(localEnv, 'FRONTEND_PORT', '8080');
  const backendPort = resolveEnv(localEnv, 'PORT', '3000');
  const apiVersion = resolveEnv(localEnv, 'API_VERSION', 'v1');
  const appUrl = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_APP_URL', `http://localhost:${frontendPort}`);
  const apiBaseUrl = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_API_URL', `http://localhost:${backendPort}/api/${apiVersion}`);
  const systemsUser = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_SYSTEMS_USER')
    || resolveEnv(localEnv, 'DEV_ADMIN_DNI')
    || resolveEnv(localEnv, 'DEV_ADMIN_USERNAME');
  const systemsPassword = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_SYSTEMS_PASSWORD')
    || resolveEnv(localEnv, 'DEV_ADMIN_PASSWORD');
  let normalUser = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_NORMAL_USER');
  let normalPassword = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_NORMAL_PASSWORD');
  const shiftCode = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_SHIFT', 'T1').toUpperCase() === 'T2' ? 'T2' : 'T1';
  const maintenanceMessage = resolveEnv(
    localEnv,
    'MAINTENANCE_SMOKE_MESSAGE',
    DEFAULT_MAINTENANCE_MESSAGE,
  );
  const headed = resolveEnv(localEnv, 'MAINTENANCE_SMOKE_HEADED', '').toLowerCase() === 'true';

  invariant(systemsUser, 'Falta MAINTENANCE_SMOKE_SYSTEMS_USER.');
  invariant(systemsPassword, 'Falta MAINTENANCE_SMOKE_SYSTEMS_PASSWORD.');
  const { chromium } = await requirePlaywright();

  logStep('Entorno', `app=${appUrl} api=${apiBaseUrl}`);
  const systemsSession = await apiLogin(apiBaseUrl, systemsUser, systemsPassword, 'Maintenance Smoke - API Systems');
  const systemsToken = systemsSession.accessToken;
  logStep('Login API SISTEMAS', 'OK');

  const rolesResponse = await requestJson(apiBaseUrl, '/roles', { token: systemsToken });
  const roles = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];
  const supervisorRole = roles.find((role) => String(role.code || '').toUpperCase() === 'SUPERVISOR');
  invariant(supervisorRole?.id, 'No se encontró el rol SUPERVISOR para crear el usuario temporal del smoke.');

  let seededSupervisorId = null;
  if (!normalUser || !normalPassword) {
    normalUser = DEFAULT_SUPERVISOR_DNI;
    normalPassword = DEFAULT_SUPERVISOR_PASSWORD;

    const usersResponse = await requestJson(apiBaseUrl, '/users', {
      token: systemsToken,
    });
    const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
    const existingSupervisor = users.find((user) => String(user.username || '') === normalUser);

    if (existingSupervisor?.id) {
      await requestJson(apiBaseUrl, `/users/${existingSupervisor.id}`, {
        method: 'PUT',
        token: systemsToken,
        body: {
          username: normalUser,
          password: normalPassword,
          name: existingSupervisor.name || 'Smoke Supervisor',
          role_id: supervisorRole.id,
          active: true,
        },
      });
      seededSupervisorId = existingSupervisor.id;
      logStep('Usuario supervisor smoke', `${normalUser} reutilizado/actualizado`);
    } else {
      const createdUserResponse = await requestJson(apiBaseUrl, '/users', {
        method: 'POST',
        token: systemsToken,
        body: {
          username: normalUser,
          password: normalPassword,
          name: 'Smoke Supervisor',
          role_id: supervisorRole.id,
          active: true,
        },
      });
      seededSupervisorId = createdUserResponse.data?.id || null;
      invariant(seededSupervisorId, 'No se pudo crear el usuario supervisor fijo del smoke.');
      logStep('Usuario supervisor smoke', `${normalUser} creado`);
    }
  }

  const contractResponse = await requestJson(apiBaseUrl, '/system-config/contract', {
    token: systemsToken,
  });
  const originalContract = contractResponse.data;
  invariant(originalContract?.system_config, 'No se pudo leer el contrato original de configuración.');

  async function updateMaintenance(enabled, message = maintenanceMessage) {
    const body = normalizeContractRequest(originalContract, {
      system_config: {
        maintenance_mode_enabled: enabled,
        maintenance_message: message,
      },
    });

    await requestJson(apiBaseUrl, '/system-config/contract', {
      method: 'PUT',
      token: systemsToken,
      body,
    });
  }

  const browser = await chromium.launch({ headless: !headed });
  try {
    logStep('Caso 1', 'Login muestra banner durante mantenimiento');
    await updateMaintenance(true);
    const guestContext = await browser.newContext({ baseURL: appUrl });
    const guestPage = await guestContext.newPage();
    try {
      await expectLoginMaintenanceBanner(guestPage, maintenanceMessage);
    } catch (error) {
      const publicContractResponse = await requestJson(apiBaseUrl, '/system-config/public-contract');
      const publicConfig = publicContractResponse.data?.system_config ?? {};
      const detail = JSON.stringify({
        maintenanceModeEnabled: publicConfig.maintenanceModeEnabled,
        maintenanceMessage: publicConfig.maintenanceMessage,
        appUrl,
      });
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} | public-contract=${detail}`,
      );
    }
    await guestContext.close();

    logStep('Caso 2', 'Usuario no SISTEMAS es rechazado tras autenticación');
    const normalContext = await browser.newContext({ baseURL: appUrl });
    const normalPage = await normalContext.newPage();
    await loginFromUi(normalPage, normalUser, normalPassword, shiftCode);
    await expectRouteContains(normalPage, '/login');
    await expectToast(normalPage, maintenanceMessage);
    await normalContext.close();

    logStep('Caso 3', 'Usuario SISTEMAS puede ingresar y abrir rutas protegidas');
    const systemsContext = await browser.newContext({ baseURL: appUrl });
    const systemsPage = await systemsContext.newPage();
    await loginFromUi(systemsPage, systemsUser, systemsPassword, shiftCode);
    await expectRouteNotContains(systemsPage, '/login');

    for (const route of ['/#/dashboard', '/#/audit', '/#/admin', '/#/inventory/stock']) {
      await systemsPage.goto(route, { waitUntil: 'networkidle' });
      const hash = await systemsPage.evaluate(() => window.location.hash);
      invariant(hash === route.slice(1), `La ruta protegida ${route} no quedó accesible para SISTEMAS. Hash actual: ${hash}`);
    }
    await systemsContext.close();

    logStep('Caso 4', 'Sesión ya abierta de usuario no SISTEMAS es expulsada');
    await updateMaintenance(false);
    const openNormalContext = await browser.newContext({ baseURL: appUrl });
    const openNormalPage = await openNormalContext.newPage();
    await loginFromUi(openNormalPage, normalUser, normalPassword, shiftCode);
    await expectRouteNotContains(openNormalPage, '/login');
    await openNormalPage.goto('/#/dashboard', { waitUntil: 'networkidle' });
    await updateMaintenance(true, `${maintenanceMessage} [expulsion]`);
    await expectRouteContains(openNormalPage, '/login');
    await expectToast(openNormalPage, `${maintenanceMessage} [expulsion]`);
    await openNormalContext.close();

    logStep('Caso 5', 'Sesión ya abierta de SISTEMAS permanece activa');
    await updateMaintenance(false);
    const openSystemsContext = await browser.newContext({ baseURL: appUrl });
    const openSystemsPage = await openSystemsContext.newPage();
    await loginFromUi(openSystemsPage, systemsUser, systemsPassword, shiftCode);
    await expectRouteNotContains(openSystemsPage, '/login');
    await openSystemsPage.goto('/#/audit', { waitUntil: 'networkidle' });
    await updateMaintenance(true, `${maintenanceMessage} [systems]`);
    await openSystemsPage.waitForTimeout(2_000);
    const systemsHash = await openSystemsPage.evaluate(() => window.location.hash);
    invariant(
      systemsHash.includes('/audit') || systemsHash.includes('/admin') || systemsHash.includes('/dashboard') || systemsHash.includes('/inventory/stock'),
      `La sesión SISTEMAS no se mantuvo en una ruta protegida. Hash actual: ${systemsHash}`,
    );
    await openSystemsContext.close();

    logStep('Resultado', 'OK');
  } finally {
    try {
      const restoreBody = normalizeContractRequest(originalContract, {
        system_config: {
          maintenance_mode_enabled: originalContract.system_config.maintenanceModeEnabled,
          maintenance_message: originalContract.system_config.maintenanceMessage,
        },
      });
      await requestJson(apiBaseUrl, '/system-config/contract', {
        method: 'PUT',
        token: systemsToken,
        body: restoreBody,
      });
      logStep('Restauración', 'Configuración original restaurada');
      if (seededSupervisorId && normalUser === DEFAULT_SUPERVISOR_DNI) {
        logStep('Limpieza', `Usuario supervisor smoke ${normalUser} conservado para futuras pruebas`);
      }
    } finally {
      await browser.close();
    }
  }
}

if (process.argv.includes('--help')) {
  process.stdout.write([
    'Smoke maintenance mode runner',
    '',
    'Variables soportadas:',
    '- MAINTENANCE_SMOKE_APP_URL',
    '- MAINTENANCE_SMOKE_API_URL',
    '- MAINTENANCE_SMOKE_SYSTEMS_USER',
    '- MAINTENANCE_SMOKE_SYSTEMS_PASSWORD',
    '- MAINTENANCE_SMOKE_NORMAL_USER (opcional; si falta, se crea un Supervisor temporal)',
    '- MAINTENANCE_SMOKE_NORMAL_PASSWORD (opcional si se crea temporal)',
    '- MAINTENANCE_SMOKE_SHIFT (T1|T2)',
    '- MAINTENANCE_SMOKE_MESSAGE',
    '- MAINTENANCE_SMOKE_HEADED=true para modo visible',
    '',
    'Requiere playwright instalado localmente.',
  ].join('\n'));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(
    `\nMaintenance smoke: FAIL\n${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
