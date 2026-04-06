import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const AREA_DEFINITIONS = [
  {
    code: 'IMPRESION',
    name: 'Impresión',
    description: 'Área de impresión',
    type: 'PRINT',
    aliases: ['IMP', 'IMPRESION', 'PRINT', 'PRINTING'],
    machinePrefix: 'IMP',
    machineNamePrefix: 'Impresora',
    count: 7,
  },
  {
    code: 'TROQUELADO',
    name: 'Troquelado',
    description: 'Área de troquelado',
    type: 'DIECUT',
    aliases: ['TROQ', 'TROQUELADO', 'DIECUT', 'DIECUTTING'],
    machinePrefix: 'TRQ',
    machineNamePrefix: 'Troqueladora',
    count: 11,
  },
  {
    code: 'REBOBINADO',
    name: 'Rebobinado',
    description: 'Área de rebobinado',
    type: 'REWIND',
    aliases: ['REBOB', 'REBOBINADO', 'REWIND', 'REWINDING'],
    machinePrefix: 'RBD',
    machineNamePrefix: 'Rebobinadora',
    count: 14,
  },
];

function parseDotEnv(content) {
  return content.split(/\r?\n/).reduce((accumulator, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      return accumulator;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

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

function buildUrl(baseUrl, pathname) {
  const normalizedBase = String(baseUrl).replace(/\/+$/, '');
  const normalizedPath = String(pathname).startsWith('/')
    ? String(pathname)
    : `/${pathname}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

async function requestJson(baseUrl, pathname, options = {}) {
  const {
    method = 'GET',
    token,
    body,
    allowStatuses = [],
  } = options;

  const response = await fetch(buildUrl(baseUrl, pathname), {
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

  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

async function apiLogin(apiBaseUrl, username, password) {
  const response = await requestJson(apiBaseUrl, '/auth/login', {
    method: 'POST',
    body: {
      username,
      password,
      deviceName: 'Seed Machines Script',
      deviceType: 'DESKTOP',
      deviceProfile: 'SEED_MACHINES',
    },
  });

  invariant(response?.accessToken, 'No se recibió accessToken al iniciar sesión.');
  return response.accessToken;
}

function buildMachinesForArea(area, areaId) {
  return Array.from({ length: area.count }, (_, index) => {
    const position = String(index + 1).padStart(2, '0');
    return {
      code: `${area.machinePrefix}-${position}`,
      name: `${area.machineNamePrefix} ${position}`,
      type: area.type,
      area_id: areaId,
      active: true,
      status: 'ACTIVE',
    };
  });
}

function findMatchingArea(existingAreas, areaDefinition) {
  const expectedCode = normalizeToken(areaDefinition.code);
  const expectedName = normalizeToken(areaDefinition.name);
  const aliases = Array.isArray(areaDefinition.aliases)
    ? areaDefinition.aliases.map((alias) => normalizeToken(alias)).filter(Boolean)
    : [];

  return existingAreas.find((area) => {
    const code = normalizeToken(area.code);
    const name = normalizeToken(area.name);
    const combined = `${code} ${name}`.trim();
    if (code === expectedCode || name === expectedName) {
      return true;
    }

    return aliases.some((alias) =>
      code === alias
      || name === alias
      || combined.includes(alias),
    );
  });
}

async function ensureArea(apiBaseUrl, token, areaDefinition, existingAreas) {
  const matched = findMatchingArea(existingAreas, areaDefinition);

  if (matched) {
    if (matched.active === false) {
      const updated = await requestJson(apiBaseUrl, `/areas/${matched.id}`, {
        method: 'PUT',
        token,
        body: {
          name: areaDefinition.name,
          description: areaDefinition.description,
          active: true,
        },
      });
      return updated;
    }
    return matched;
  }

  return requestJson(apiBaseUrl, '/areas', {
    method: 'POST',
    token,
    body: {
      code: areaDefinition.code,
      name: areaDefinition.name,
      description: areaDefinition.description,
      active: true,
    },
  });
}

async function upsertMachine(apiBaseUrl, token, desiredMachine, existingMachines) {
  const matched = existingMachines.find(
    (machine) => normalizeToken(machine.code) === normalizeToken(desiredMachine.code),
  );

  if (matched) {
    const updated = await requestJson(apiBaseUrl, `/machines/${matched.id}`, {
      method: 'PUT',
      token,
      body: desiredMachine,
    });
    return { action: 'updated', machine: updated };
  }

  const created = await requestJson(apiBaseUrl, '/machines', {
    method: 'POST',
    token,
    body: desiredMachine,
  });
  return { action: 'created', machine: created };
}

function log(message) {
  process.stdout.write(`[seed-machines] ${message}\n`);
}

async function main() {
  const rootEnv = await loadEnvFile('.env');
  const backendEnv = await loadEnvFile(path.join('backend', '.env'));
  const localEnv = { ...rootEnv, ...backendEnv };

  const backendPort = resolveEnv(localEnv, 'PORT', '3000');
  const apiVersion = resolveEnv(localEnv, 'API_VERSION', 'v1');
  const apiBaseUrl = resolveEnv(localEnv, 'SEED_MACHINES_API_URL', `http://localhost:${backendPort}/api/${apiVersion}`);
  const systemsUser = resolveEnv(localEnv, 'SEED_MACHINES_USER')
    || resolveEnv(localEnv, 'DEV_ADMIN_DNI')
    || resolveEnv(localEnv, 'DEV_ADMIN_USERNAME');
  const systemsPassword = resolveEnv(localEnv, 'SEED_MACHINES_PASSWORD')
    || resolveEnv(localEnv, 'DEV_ADMIN_PASSWORD');

  invariant(systemsUser, 'Falta SEED_MACHINES_USER o DEV_ADMIN_DNI en .env.');
  invariant(systemsPassword, 'Falta SEED_MACHINES_PASSWORD o DEV_ADMIN_PASSWORD en .env.');

  log(`API ${apiBaseUrl}`);
  const token = await apiLogin(apiBaseUrl, systemsUser, systemsPassword);
  log(`Login OK con ${systemsUser}`);

  const existingAreas = await requestJson(apiBaseUrl, '/areas', { token });
  const existingMachines = await requestJson(apiBaseUrl, '/machines', { token });
  const areas = Array.isArray(existingAreas) ? existingAreas : [];
  const machines = Array.isArray(existingMachines) ? existingMachines : [];

  let createdAreas = 0;
  let reactivatedAreas = 0;
  let createdMachines = 0;
  let updatedMachines = 0;

  for (const areaDefinition of AREA_DEFINITIONS) {
    const areaBefore = findMatchingArea(areas, areaDefinition);
    const ensuredArea = await ensureArea(apiBaseUrl, token, areaDefinition, areas);
    const areaRecord = {
      id: ensuredArea.id,
      code: ensuredArea.code,
      name: ensuredArea.name,
      active: ensuredArea.active !== false,
    };

    if (!areaBefore) {
      createdAreas += 1;
      areas.push(areaRecord);
      log(`Área creada: ${areaRecord.code} (${areaRecord.name})`);
    } else if (areaBefore.active === false && areaRecord.active) {
      reactivatedAreas += 1;
      const index = areas.findIndex((item) => item.id === areaRecord.id);
      if (index >= 0) areas[index] = areaRecord;
      log(`Área reactivada: ${areaRecord.code} (${areaRecord.name})`);
    }

    const desiredMachines = buildMachinesForArea(areaDefinition, areaRecord.id);
    for (const desiredMachine of desiredMachines) {
      const result = await upsertMachine(apiBaseUrl, token, desiredMachine, machines);
      if (result.action === 'created') {
        createdMachines += 1;
        machines.push(result.machine);
      } else {
        updatedMachines += 1;
        const index = machines.findIndex((item) => item.id === result.machine.id);
        if (index >= 0) machines[index] = result.machine;
      }
    }

    log(`${areaDefinition.name}: ${desiredMachines.length} máquinas sincronizadas`);
  }

  const totalRequested = AREA_DEFINITIONS.reduce((sum, area) => sum + area.count, 0);
  log(`Resumen -> áreas creadas: ${createdAreas}, áreas reactivadas: ${reactivatedAreas}, máquinas creadas: ${createdMachines}, máquinas actualizadas: ${updatedMachines}, objetivo total: ${totalRequested}`);
}

if (process.argv.includes('--help')) {
  process.stdout.write([
    'Seed machines script',
    '',
    'Crea o actualiza máquinas base para:',
    '- 7 Impresión',
    '- 11 Troquelado',
    '- 14 Rebobinado',
    '',
    'Variables soportadas:',
    '- SEED_MACHINES_API_URL',
    '- SEED_MACHINES_USER',
    '- SEED_MACHINES_PASSWORD',
    '',
    'Defaults:',
    '- API: http://localhost:3000/api/v1',
    '- Usuario: DEV_ADMIN_DNI / DEV_ADMIN_USERNAME',
    '- Password: DEV_ADMIN_PASSWORD',
  ].join('\n'));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`\nSeed machines: FAIL\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
