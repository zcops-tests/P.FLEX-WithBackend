import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const DEFAULT_SUPERVISOR_DNI = '11111111';
const DEFAULT_SUPERVISOR_PASSWORD = '45TR37hn';
const DEFAULT_THRESHOLD = 2;

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

function logStep(label, detail = '') {
  process.stdout.write(`[security-smoke] ${label}${detail ? `: ${detail}` : ''}\n`);
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

function getMariaDb() {
  try {
    return require(path.join(repoRoot, 'backend', 'node_modules', 'mariadb'));
  } catch (error) {
    throw new Error(
      `No se pudo cargar mariadb desde backend/node_modules. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function createDbPool(databaseUrl) {
  const mariadb = getMariaDb();
  const parsed = new URL(databaseUrl);
  return mariadb.createPool({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: 2,
  });
}

async function apiLogin(apiBaseUrl, username, password, deviceName, allowStatuses = []) {
  return requestJson(apiBaseUrl, '/auth/login', {
    method: 'POST',
    body: {
      username,
      password,
      deviceName,
      deviceType: 'DESKTOP',
      deviceProfile: 'SECURITY_SMOKE',
    },
    allowStatuses,
  });
}

async function ensureSupervisorUser(apiBaseUrl, systemsToken, username, password) {
  const rolesResponse = await requestJson(apiBaseUrl, '/roles', { token: systemsToken });
  const roles = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];
  const supervisorRole = roles.find((role) => String(role.code || '').toUpperCase() === 'SUPERVISOR');
  invariant(supervisorRole?.id, 'No se encontró el rol SUPERVISOR.');

  const usersResponse = await requestJson(apiBaseUrl, '/users', { token: systemsToken });
  const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
  const existing = users.find((user) => String(user.username || '') === username);

  if (existing?.id) {
    await requestJson(apiBaseUrl, `/users/${existing.id}`, {
      method: 'PUT',
      token: systemsToken,
      body: {
        username,
        password,
        name: existing.name || 'Smoke Supervisor',
        role_id: supervisorRole.id,
        active: true,
      },
    });
    return existing.id;
  }

  const createdUserResponse = await requestJson(apiBaseUrl, '/users', {
    method: 'POST',
    token: systemsToken,
    body: {
      username,
      password,
      name: 'Smoke Supervisor',
      role_id: supervisorRole.id,
      active: true,
    },
  });

  invariant(createdUserResponse.data?.id, 'No se pudo crear el usuario supervisor de smoke.');
  return createdUserResponse.data.id;
}

async function resetSecurityState(pool, userId) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         last_failed_login_at = NULL,
         locked_until = NULL,
         deleted_at = NULL,
         active = 1
     WHERE id = ?`,
    [userId],
  );
}

async function findAuditRecord(pool, username, threshold, startedAt) {
  const rows = await pool.query(
    `SELECT id, action, new_values, created_at
       FROM audit_logs
      WHERE action = 'LOGIN_LOCKED'
        AND created_at >= ?
        AND JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.username')) = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [startedAt, username],
  );

  const row = rows[0];
  invariant(row, 'No se encontró auditoría LOGIN_LOCKED para el usuario de prueba.');
  const payload = typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values;
  invariant(payload.failedAttempts === threshold, `La auditoría no registró failedAttempts=${threshold}.`);
  invariant(payload.maxAttempts === threshold, `La auditoría no registró maxAttempts=${threshold}.`);
  invariant(payload.reason === 'INVALID_PASSWORD', 'La auditoría no registró reason=INVALID_PASSWORD.');
  return row;
}

async function findOutboxEvent(pool, username, threshold, startedAt) {
  const rows = await pool.query(
    `SELECT id, event_name, payload, created_at
       FROM outbox_events
      WHERE event_name = 'security.failed-login-threshold-reached'
        AND created_at >= ?
        AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.username')) = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [startedAt, username],
  );

  const row = rows[0];
  invariant(row, 'No se encontró evento outbox security.failed-login-threshold-reached.');
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  invariant(payload.failedAttempts === threshold, `El outbox no registró failedAttempts=${threshold}.`);
  invariant(payload.maxAttempts === threshold, `El outbox no registró maxAttempts=${threshold}.`);
  invariant(payload.reason === 'INVALID_PASSWORD', 'El outbox no registró reason=INVALID_PASSWORD.');
  return row;
}

async function main() {
  const rootEnv = await loadEnvFile('.env');
  const backendEnv = await loadEnvFile(path.join('backend', '.env'));
  const localEnv = { ...rootEnv, ...backendEnv };

  const backendPort = resolveEnv(localEnv, 'PORT', '3000');
  const apiVersion = resolveEnv(localEnv, 'API_VERSION', 'v1');
  const apiBaseUrl = resolveEnv(localEnv, 'SECURITY_SMOKE_API_URL', `http://localhost:${backendPort}/api/${apiVersion}`);
  const systemsUser = resolveEnv(localEnv, 'SECURITY_SMOKE_SYSTEMS_USER')
    || resolveEnv(localEnv, 'DEV_ADMIN_DNI')
    || resolveEnv(localEnv, 'DEV_ADMIN_USERNAME');
  const systemsPassword = resolveEnv(localEnv, 'SECURITY_SMOKE_SYSTEMS_PASSWORD')
    || resolveEnv(localEnv, 'DEV_ADMIN_PASSWORD');
  const supervisorUser = resolveEnv(localEnv, 'SECURITY_SMOKE_SUPERVISOR_USER', DEFAULT_SUPERVISOR_DNI);
  const supervisorPassword = resolveEnv(localEnv, 'SECURITY_SMOKE_SUPERVISOR_PASSWORD', DEFAULT_SUPERVISOR_PASSWORD);
  const failedAttemptsThreshold = Math.max(
    1,
    Number(resolveEnv(localEnv, 'SECURITY_SMOKE_THRESHOLD', String(DEFAULT_THRESHOLD))),
  );
  const databaseUrl = resolveEnv(localEnv, 'DATABASE_URL');

  invariant(systemsUser, 'Falta SECURITY_SMOKE_SYSTEMS_USER o DEV_ADMIN_DNI/DEV_ADMIN_USERNAME.');
  invariant(systemsPassword, 'Falta SECURITY_SMOKE_SYSTEMS_PASSWORD o DEV_ADMIN_PASSWORD.');
  invariant(databaseUrl, 'Falta DATABASE_URL para validar auditoría y outbox.');

  const pool = createDbPool(databaseUrl);
  let systemsToken = '';
  let originalContract = null;
  let supervisorId = null;

  try {
    logStep('Entorno', `api=${apiBaseUrl} threshold=${failedAttemptsThreshold}`);

    const systemsSession = await apiLogin(
      apiBaseUrl,
      systemsUser,
      systemsPassword,
      'Security Smoke - Systems',
    );
    invariant(systemsSession.data?.accessToken, 'El login de SISTEMAS no devolvió accessToken.');
    systemsToken = systemsSession.data.accessToken;
    logStep('Login SISTEMAS', 'OK');

    const contractResponse = await requestJson(apiBaseUrl, '/system-config/contract', {
      token: systemsToken,
    });
    originalContract = contractResponse.data;
    invariant(originalContract?.system_config, 'No se pudo obtener system-config/contract.');

    supervisorId = await ensureSupervisorUser(
      apiBaseUrl,
      systemsToken,
      supervisorUser,
      supervisorPassword,
    );
    logStep('Supervisor de prueba', `${supervisorUser} -> ${supervisorId}`);

    await resetSecurityState(pool, supervisorId);
    logStep('Reset usuario', 'OK');

    const updatedContractBody = normalizeContractRequest(originalContract, {
      system_config: {
        failed_login_max_attempts: failedAttemptsThreshold,
      },
    });
    await requestJson(apiBaseUrl, '/system-config/contract', {
      method: 'PUT',
      token: systemsToken,
      body: updatedContractBody,
    });
    logStep('Cambio de umbral', `${failedAttemptsThreshold}`);

    const startedAt = new Date();

    for (let attempt = 1; attempt <= failedAttemptsThreshold; attempt += 1) {
      const failedLogin = await apiLogin(
        apiBaseUrl,
        supervisorUser,
        `${supervisorPassword}-bad`,
        `Security Smoke - Failed ${attempt}`,
        [401],
      );
      invariant(
        failedLogin.status === 401,
        `El intento fallido ${attempt} no devolvió 401. Estado: ${failedLogin.status}`,
      );
      logStep('Intento fallido', `${attempt}/${failedAttemptsThreshold}`);
    }

    const lockedLogin = await apiLogin(
      apiBaseUrl,
      supervisorUser,
      supervisorPassword,
      'Security Smoke - Locked Check',
      [429],
    );
    invariant(
      lockedLogin.status === 429,
      `El login bloqueado no devolvió 429. Estado: ${lockedLogin.status}`,
    );
    logStep('Lock confirmado', String(lockedLogin.raw?.message || lockedLogin.status));

    const auditRecord = await findAuditRecord(
      pool,
      supervisorUser,
      failedAttemptsThreshold,
      startedAt,
    );
    logStep('Auditoría confirmada', `id=${auditRecord.id}`);

    const outboxEvent = await findOutboxEvent(
      pool,
      supervisorUser,
      failedAttemptsThreshold,
      startedAt,
    );
    logStep('Outbox confirmado', `id=${outboxEvent.id}`);

    process.stdout.write('\nSecurity failed-login smoke: OK\n');
  } finally {
    try {
      if (systemsToken && originalContract?.system_config) {
        const restoreBody = normalizeContractRequest(originalContract, {
          system_config: {
            failed_login_max_attempts: originalContract.system_config.failedLoginMaxAttempts,
          },
        });
        await requestJson(apiBaseUrl, '/system-config/contract', {
          method: 'PUT',
          token: systemsToken,
          body: restoreBody,
        });
        logStep('Restauración umbral', String(originalContract.system_config.failedLoginMaxAttempts));
      }

      if (supervisorId) {
        await resetSecurityState(pool, supervisorId);
        logStep('Restauración usuario', 'OK');
      }
    } finally {
      await pool.end();
    }
  }
}

if (process.argv.includes('--help')) {
  process.stdout.write([
    'Smoke failed-login security runner',
    '',
    'Variables soportadas:',
    '- SECURITY_SMOKE_API_URL',
    '- SECURITY_SMOKE_SYSTEMS_USER',
    '- SECURITY_SMOKE_SYSTEMS_PASSWORD',
    '- SECURITY_SMOKE_SUPERVISOR_USER',
    '- SECURITY_SMOKE_SUPERVISOR_PASSWORD',
    '- SECURITY_SMOKE_THRESHOLD',
    '',
    'Requiere DATABASE_URL disponible para validar audit_logs y outbox_events.',
  ].join('\n'));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(
    `\nSecurity failed-login smoke: FAIL\n${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
