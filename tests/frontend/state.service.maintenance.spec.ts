import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { StateService } from '../../src/services/state.service';

const stateSource = readFileSync(
  resolve(process.cwd(), 'src/services/state.service.ts'),
  'utf8',
);

function createConfig(overrides: Record<string, unknown> = {}) {
  return {
    maintenanceModeEnabled: false,
    maintenanceMessage: '',
    ...overrides,
  };
}

function createUser(roleName: string) {
  return {
    id: `user-${roleName}`,
    name: roleName,
    role: roleName,
    roleName,
    roleCode: roleName.toUpperCase(),
    permissionCodes: [],
  };
}

function createStateHarness(overrides: Record<string, unknown> = {}) {
  const service = Object.create(StateService.prototype) as StateService & Record<string, any>;
  service.config = () => createConfig();
  service.currentUser = () => null;
  service.isMaintenanceActive = () => false;
  service.isMaintenanceBlockingAccess = () => false;
  service.notifyMaintenanceRestriction = () => {};
  service.logout = async () => undefined;
  service.redirectToLogin = () => {};
  service.maintenanceEnforcementInFlight = false;
  service.normalizeUserRole = StateService.prototype.normalizeUserRole;
  service.isSystemsUser = (StateService.prototype as any).isSystemsUser;
  Object.assign(service, overrides);
  return service;
}

test('state service declares centralized maintenance computed state and enforcement effect', () => {
  assert.match(stateSource, /readonly isMaintenanceActive = computed/);
  assert.match(stateSource, /readonly isSystemsRole = computed/);
  assert.match(stateSource, /readonly isMaintenanceBlockingAccess = computed/);
  assert.match(stateSource, /void this\.rejectMaintenanceAccessIfNeeded\(\)/);
  assert.match(stateSource, /startPublicConfigRefresh\(\)/);
  assert.match(stateSource, /setInterval\(\(\) => \{\s*void this\.loadPublicConfig\(\);\s*\}, StateService\.publicConfigRefreshMs\)/s);
});

test('state service normalizes admin-like roles to Sistemas for maintenance bypass', () => {
  const harness = createStateHarness();
  assert.equal(harness.normalizeUserRole('ADMIN'), 'Sistemas');
  assert.equal(harness.normalizeUserRole('sistemas'), 'Sistemas');
  assert.equal(harness.normalizeUserRole('Supervisor'), 'Supervisor');
});

test('state service canAccessDuringMaintenance blocks non-sistemas users and allows sistemas', () => {
  const harness = createStateHarness({
    isMaintenanceActive: () => true,
  });

  assert.equal(harness.canAccessDuringMaintenance(createUser('Supervisor')), false);
  assert.equal(harness.canAccessDuringMaintenance(createUser('Sistemas')), true);
});

test('state service returns configured maintenance message or fallback', () => {
  const configuredHarness = createStateHarness({
    config: () => createConfig({ maintenanceMessage: 'Ventana ERP activa' }),
  });
  const fallbackHarness = createStateHarness({
    config: () => createConfig(),
  });

  assert.equal(
    configuredHarness.getMaintenanceAccessMessage(),
    'Ventana ERP activa',
  );
  assert.equal(
    fallbackHarness.getMaintenanceAccessMessage(),
    'El sistema está en mantenimiento. Solo el rol SISTEMAS puede acceder en este momento.',
  );
});

test('state service rejects non-sistemas access during maintenance and preserves sistemas sessions', async () => {
  let warned = 0;
  let redirected = 0;
  let logoutOptions: any = null;

  const blockedHarness = createStateHarness({
    currentUser: () => createUser('Supervisor'),
    isMaintenanceBlockingAccess: () => true,
    notifyMaintenanceRestriction() {
      warned += 1;
    },
    async logout(options: any = {}) {
      logoutOptions = options;
    },
    redirectToLogin() {
      redirected += 1;
    },
  });

  const blocked = await blockedHarness.rejectMaintenanceAccessIfNeeded();
  assert.equal(blocked, true);
  assert.equal(warned, 1);
  assert.equal(redirected, 1);
  assert.deepEqual(logoutOptions, { skipAudit: true });

  warned = 0;
  redirected = 0;
  logoutOptions = null;

  const allowedHarness = createStateHarness({
    currentUser: () => createUser('Sistemas'),
    isMaintenanceBlockingAccess: () => false,
    notifyMaintenanceRestriction() {
      warned += 1;
    },
    async logout(options: any = {}) {
      logoutOptions = options;
    },
    redirectToLogin() {
      redirected += 1;
    },
  });

  const allowed = await allowedHarness.rejectMaintenanceAccessIfNeeded();
  assert.equal(allowed, false);
  assert.equal(warned, 0);
  assert.equal(redirected, 0);
  assert.equal(logoutOptions, null);
});
