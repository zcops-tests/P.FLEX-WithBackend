import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminConfigComponent } from '../../src/features/admin/components/admin-config.component';

function createConfig(overrides: Record<string, unknown> = {}) {
  return {
    shiftName1: 'Turno 1',
    shiftTime1: '06:00',
    shiftEndTime1: '14:00',
    shiftName2: 'Turno 2',
    shiftTime2: '14:00',
    shiftEndTime2: '22:00',
    passwordExpiryWarningDays: 7,
    passwordPolicyDays: 90,
    plantName: 'P.FLEX',
    autoLogoutMinutes: 30,
    operatorMessage: '',
    timezoneName: 'America/Lima',
    maintenanceModeEnabled: false,
    maintenanceMessage: '',
    offlineRetentionDays: 30,
    backupFrequency: 'DAILY',
    conflictResolutionPolicy: 'MANUAL_REVIEW',
    productionAssistantMessage: '',
    finishingManagerMessage: '',
    managementMessage: '',
    failedLoginAlertMode: 'AUDIT_ONLY',
    failedLoginMaxAttempts: 5,
    otAllowPartialClose: false,
    otAllowCloseWithWaste: false,
    otAllowForcedClose: false,
    otForcedCloseRequiresReason: true,
    ...overrides,
  };
}

function createComponent(overrides: Record<string, unknown> = {}) {
  const baseConfig = createConfig();
  const component = Object.create(AdminConfigComponent.prototype) as AdminConfigComponent & Record<string, any>;
  const updateCalls: any[] = [];
  const notifications = {
    success: [] as string[],
    warning: [] as string[],
    error: [] as string[],
    showSuccess(message: string) {
      this.success.push(message);
    },
    showWarning(message: string) {
      this.warning.push(message);
    },
    showError(message: string) {
      this.error.push(message);
    },
  };

  Object.assign(component, {
    router: {
      async navigate() {
        return true;
      },
    },
    notifications,
    state: {
      systemConfigContract() {
        return { audit_preview: [] };
      },
    },
    adminService: {
      currentConfig: baseConfig,
      config() {
        return this.currentConfig;
      },
      async updateConfig(nextConfig: any) {
        updateCalls.push(nextConfig);
        this.currentConfig = { ...nextConfig };
      },
    },
    backupFrequencyOptions: [
      { value: 'HOURLY', label: 'Cada 1 Hora' },
      { value: 'EVERY_4_HOURS', label: 'Cada 4 Horas' },
      { value: 'DAILY', label: 'Diario' },
    ],
    conflictResolutionOptions: [
      { value: 'SERVER_WINS', label: 'Servidor gana' },
      { value: 'CLIENT_WINS', label: 'Dispositivo gana' },
      { value: 'MANUAL_REVIEW', label: 'Manual' },
    ],
    failedLoginAlertOptions: [
      { value: 'AUDIT_ONLY', label: 'Solo auditoría' },
      { value: 'NOTIFY_AND_AUDIT', label: 'Notificar y auditar' },
    ],
    tempConfig: { ...baseConfig },
    isSaving: false,
    lastSyncedConfig: { ...baseConfig },
    __updateCalls: updateCalls,
    ...overrides,
  });

  return component;
}

test('admin config saves a valid contract draft and refreshes local state', async () => {
  const component = createComponent();
  component.tempConfig = createConfig({
    plantName: 'P.FLEX Norte',
    backupFrequency: 'HOURLY',
    failedLoginAlertMode: 'NOTIFY_AND_AUDIT',
  });

  await component.saveConfig();

  assert.equal(component.__updateCalls.length, 1);
  assert.equal(component.__updateCalls[0].plantName, 'P.FLEX Norte');
  assert.equal(component.tempConfig.plantName, 'P.FLEX Norte');
  assert.deepEqual(component.notifications.success, [
    'La configuración se guardó correctamente.',
  ]);
  assert.equal(component.notifications.warning.length, 0);
  assert.equal(component.notifications.error.length, 0);
});

test('admin config blocks invalid visible values before hitting the backend', async () => {
  const component = createComponent();
  component.tempConfig = createConfig({
    autoLogoutMinutes: 2,
  });

  await component.saveConfig();

  assert.equal(component.__updateCalls.length, 0);
  assert.deepEqual(component.notifications.warning, [
    'El cierre automático debe estar entre 5 y 1440 minutos.',
  ]);
});

test('admin config restores backend state and reports the error when save fails', async () => {
  const component = createComponent({
    adminService: {
      currentConfig: createConfig(),
      config() {
        return this.currentConfig;
      },
      async updateConfig() {
        throw new Error('Persist failed');
      },
    },
  });
  component.tempConfig = createConfig({ plantName: 'Cambio local' });

  await component.saveConfig();

  assert.equal(component.tempConfig.plantName, 'P.FLEX');
  assert.deepEqual(component.notifications.error, ['Persist failed']);
});

test('admin config navigates to audit and reports navigation failures', async () => {
  const component = createComponent({
    router: {
      async navigate() {
        return false;
      },
    },
  });

  await component.goToAudit();

  assert.deepEqual(component.notifications.error, [
    'No fue posible abrir la pantalla de auditoría.',
  ]);
});

test('admin config persists maintenance flag and message in the real contract payload', async () => {
  const component = createComponent();
  component.tempConfig = createConfig({
    maintenanceModeEnabled: true,
    maintenanceMessage: 'Ventana de mantenimiento ERP',
  });

  await component.saveConfig();

  assert.equal(component.__updateCalls.length, 1);
  assert.equal(component.__updateCalls[0].maintenanceModeEnabled, true);
  assert.equal(
    component.__updateCalls[0].maintenanceMessage,
    'Ventana de mantenimiento ERP',
  );
});
