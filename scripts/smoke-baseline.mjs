import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseDotEnv(content) {
  return content
    .split(/\r?\n/)
    .reduce((accumulator, rawLine) => {
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

function normalizeMachineArea(machine) {
  const areaName = String(machine?.area?.name || machine?.area || '').toUpperCase();
  const typeName = String(machine?.type || '').toUpperCase();

  if (areaName.includes('IMP') || typeName.includes('PRINT')) return 'IMPRESION';
  if (areaName.includes('TROQ') || typeName.includes('DIECUT')) return 'TROQUELADO';
  if (areaName.includes('REBOB') || typeName.includes('REWIND')) return 'REBOBINADO';
  if (areaName.includes('EMPAQ') || typeName.includes('PACK')) return 'EMPAQUETADO';
  return 'UNKNOWN';
}

function findOperator(users, requestedDni) {
  if (requestedDni) {
    return users.find((user) => String(user.username || '').trim() === requestedDni) || null;
  }

  return (
    users.find((user) => {
      const roleCode = String(user?.role?.code || user.role_code || user.roleCode || '').toUpperCase();
      const roleName = String(user?.role?.name || user.role_name || user.roleName || '').toUpperCase();
      return roleCode === 'OPERATOR' || roleName.includes('OPERARIO');
    })
    || null
  );
}

function printCheck(label, detail) {
  process.stdout.write(`[smoke] ${label}${detail ? `: ${detail}` : ''}\n`);
}

function printWarning(label, detail) {
  process.stdout.write(`[smoke][warn] ${label}${detail ? `: ${detail}` : ''}\n`);
}

if (process.argv.includes('--help')) {
  process.stdout.write(
    [
      'Smoke baseline runner',
      '',
      'Variables soportadas:',
      '- SMOKE_API_BASE_URL',
      '- SMOKE_HOST_DNI',
      '- SMOKE_HOST_PASSWORD',
      '- SMOKE_OPERATOR_DNI',
    ].join('\n'),
  );
  process.exit(0);
}

const rootEnv = await loadEnvFile('.env');
const backendEnv = await loadEnvFile(path.join('backend', '.env'));
const localEnv = { ...rootEnv, ...backendEnv };

const apiBaseUrl = resolveEnv(localEnv, 'SMOKE_API_BASE_URL')
  || resolveEnv(localEnv, 'BACKEND_BASE_URL')
  || resolveEnv(localEnv, 'API_BASE_URL')
  || 'http://localhost:3000/api/v1';
const hostDni = resolveEnv(localEnv, 'SMOKE_HOST_DNI')
  || resolveEnv(localEnv, 'DEV_ADMIN_USERNAME');
const hostPassword = resolveEnv(localEnv, 'SMOKE_HOST_PASSWORD')
  || resolveEnv(localEnv, 'DEV_ADMIN_PASSWORD');
const requestedOperatorDni = resolveEnv(localEnv, 'SMOKE_OPERATOR_DNI');

try {
  invariant(hostDni, 'No se encontró SMOKE_HOST_DNI ni DEV_ADMIN_USERNAME para el smoke baseline.');
  invariant(hostPassword, 'No se encontró SMOKE_HOST_PASSWORD ni DEV_ADMIN_PASSWORD para el smoke baseline.');

  const warnings = [];

  const liveResponse = await requestJson(apiBaseUrl, '/health/live');
  const live = liveResponse.data;
  printCheck('health/live', 'OK');
  invariant(String(live?.status || '').toUpperCase() === 'UP', 'health/live no devolvió status UP.');

  const readyResponse = await requestJson(apiBaseUrl, '/health/ready', {
    allowStatuses: [503],
  });
  const ready = readyResponse.data;
  if (readyResponse.ok && String(ready?.status || '').toUpperCase() === 'UP') {
    printCheck('health/ready', 'OK');
  } else {
    const detail =
      typeof readyResponse.raw === 'object' && readyResponse.raw
        ? JSON.stringify(readyResponse.raw)
        : String(readyResponse.raw || readyResponse.status);
    warnings.push(`health/ready no esta listo: ${detail}`);
    printWarning('health/ready', 'NO READY');
  }

  const loginResponse = await requestJson(apiBaseUrl, '/auth/login', {
    method: 'POST',
    body: {
      username: hostDni,
      password: hostPassword,
      deviceName: 'Baseline Smoke Runner',
      deviceType: 'DESKTOP',
      deviceProfile: 'REGRESSION_SMOKE',
    },
  });
  const login = loginResponse.data;
  invariant(login?.accessToken, 'El login no devolvió accessToken.');
  printCheck('auth/login', 'OK');

  const token = login.accessToken;
  const meResponse = await requestJson(apiBaseUrl, '/auth/me', { token });
  const me = meResponse.data;
  invariant(Array.isArray(me?.permissionCodes), 'auth/me no devolvió permissionCodes.');
  printCheck('auth/me', `${me?.name || me?.roleName || 'usuario'} autenticado`);

  const usersResponse = await requestJson(apiBaseUrl, '/users', { token });
  const users = usersResponse.data;
  invariant(Array.isArray(users) && users.length > 0, 'GET /users no devolvió usuarios activos.');
  printCheck('users', `${users.length} usuarios`);

  const operator = findOperator(users, requestedOperatorDni);
  invariant(operator, 'No se pudo resolver un operario activo para el smoke baseline.');
  const operatorDni = String(operator.username || '').trim();

  const identifiedOperatorResponse = await requestJson(apiBaseUrl, '/users/operator-identification', {
    method: 'POST',
    token,
    body: { dni: operatorDni },
  });
  const identifiedOperator = identifiedOperatorResponse.data;
  invariant(
    String(identifiedOperator?.username || '').trim() === operatorDni,
    'La identificación de operario no devolvió el username/DNI esperado.',
  );
  printCheck('operator-identification', operatorDni);

  const machinesResponse = await requestJson(apiBaseUrl, '/machines', { token });
  const machines = machinesResponse.data;
  invariant(Array.isArray(machines) && machines.length > 0, 'GET /machines no devolvió máquinas activas.');

  const processCoverage = {
    IMPRESION: machines.some((machine) => normalizeMachineArea(machine) === 'IMPRESION'),
    TROQUELADO: machines.some((machine) => normalizeMachineArea(machine) === 'TROQUELADO'),
    REBOBINADO: machines.some((machine) => normalizeMachineArea(machine) === 'REBOBINADO'),
  };
  invariant(processCoverage.IMPRESION, 'No hay máquinas detectables de Impresión en el smoke baseline.');
  invariant(processCoverage.TROQUELADO, 'No hay máquinas detectables de Troquelado en el smoke baseline.');
  invariant(processCoverage.REBOBINADO, 'No hay máquinas detectables de Rebobinado en el smoke baseline.');
  printCheck('machines', `${machines.length} máquinas`);

  const shiftsResponse = await requestJson(apiBaseUrl, '/shifts', { token });
  const shifts = shiftsResponse.data;
  invariant(Array.isArray(shifts) && shifts.length > 0, 'GET /shifts no devolvió turnos activos.');
  printCheck('shifts', `${shifts.length} turnos`);

  const workOrdersResponse = await requestJson(apiBaseUrl, '/work-orders', {
    token,
    query: { page: 1, pageSize: 5 },
  });
  const workOrders = workOrdersResponse.data;
  invariant(Array.isArray(workOrders?.items), 'GET /work-orders no devolvió items paginados.');
  printCheck('work-orders', `${workOrders.items.length} items en la primera página`);

  const firstWorkOrder = workOrders.items[0];
  if (firstWorkOrder) {
    invariant(
      Object.prototype.hasOwnProperty.call(firstWorkOrder, 'raw_payload')
      && typeof firstWorkOrder.raw_payload === 'object'
      && firstWorkOrder.raw_payload !== null
      && Object.prototype.hasOwnProperty.call(firstWorkOrder, 'fecha_programada_produccion'),
      'La respuesta de work-orders no expone el contrato actual basado en OT + raw_payload para programación.',
    );
  }

  const managementOrdersResponse = await requestJson(apiBaseUrl, '/work-orders/management', { token });
  const managementOrders = managementOrdersResponse.data;
  invariant(Array.isArray(managementOrders), 'GET /work-orders/management no devolvió un arreglo.');
  printCheck('work-orders/management', `${managementOrders.length} OTs en gestión`);

  const printReportsResponse = await requestJson(apiBaseUrl, '/production/printing/reports', {
    token,
    query: { page: 1, pageSize: 5 },
  });
  const printReports = printReportsResponse.data;
  invariant(Array.isArray(printReports?.items), 'GET /production/printing/reports no devolvió items.');
  printCheck('reports.print', `${printReports.items.length} items`);
  if (printReports.items[0]?.id) {
    const detailResponse = await requestJson(apiBaseUrl, `/production/printing/reports/${printReports.items[0].id}`, { token });
    const detail = detailResponse.data;
    invariant(detail?.id === printReports.items[0].id, 'El detalle de impresión no coincide con el item listado.');
  }

  const diecutReportsResponse = await requestJson(apiBaseUrl, '/production/diecutting/reports', {
    token,
    query: { page: 1, pageSize: 5 },
  });
  const diecutReports = diecutReportsResponse.data;
  invariant(Array.isArray(diecutReports?.items), 'GET /production/diecutting/reports no devolvió items.');
  printCheck('reports.diecut', `${diecutReports.items.length} items`);
  if (diecutReports.items[0]?.id) {
    const detailResponse = await requestJson(apiBaseUrl, `/production/diecutting/reports/${diecutReports.items[0].id}`, { token });
    const detail = detailResponse.data;
    invariant(detail?.id === diecutReports.items[0].id, 'El detalle de troquelado no coincide con el item listado.');
  }

  const rewindReportsResponse = await requestJson(apiBaseUrl, '/production/rewinding/reports', {
    token,
    query: { page: 1, pageSize: 5 },
  });
  const rewindReports = rewindReportsResponse.data;
  invariant(Array.isArray(rewindReports?.items), 'GET /production/rewinding/reports no devolvió items.');
  printCheck('reports.rewind', `${rewindReports.items.length} items`);
  if (rewindReports.items[0]?.id) {
    const detailResponse = await requestJson(apiBaseUrl, `/production/rewinding/reports/${rewindReports.items[0].id}`, { token });
    const detail = detailResponse.data;
    invariant(detail?.id === rewindReports.items[0].id, 'El detalle de rebobinado no coincide con el item listado.');
  }

  const packagingReportsResponse = await requestJson(apiBaseUrl, '/production/packaging/reports', {
    token,
    query: { page: 1, pageSize: 5 },
  });
  const packagingReports = packagingReportsResponse.data;
  invariant(Array.isArray(packagingReports?.items), 'GET /production/packaging/reports no devolvió items.');
  printCheck('reports.packaging', `${packagingReports.items.length} items`);
  if (packagingReports.items[0]?.id) {
    const detailResponse = await requestJson(apiBaseUrl, `/production/packaging/reports/${packagingReports.items[0].id}`, { token });
    const detail = detailResponse.data;
    invariant(detail?.id === packagingReports.items[0].id, 'El detalle de empaquetado no coincide con el item listado.');
  }

  if (warnings.length > 0) {
    process.stdout.write('\nSmoke baseline API: OK WITH WARNINGS\n');
    warnings.forEach((warning) => process.stdout.write(`- ${warning}\n`));
    process.exit(0);
  }

  process.stdout.write('\nSmoke baseline API: OK\n');
} catch (error) {
  process.stderr.write(`\nSmoke baseline API: FAIL\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
