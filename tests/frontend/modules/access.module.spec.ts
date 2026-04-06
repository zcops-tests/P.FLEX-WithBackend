import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { LoginComponent } from '../../../src/features/access/login.component';
import { ModeSelectorComponent } from '../../../src/features/access/mode-selector.component';

const loginSource = readFileSync(resolve(process.cwd(), 'src/features/access/login.component.ts'), 'utf8');
const modeSelectorSource = readFileSync(resolve(process.cwd(), 'src/features/access/mode-selector.component.ts'), 'utf8');

function createLoginComponent() {
  const component = Object.create(LoginComponent.prototype) as LoginComponent & Record<string, any>;
  component.state = {
    systemConfigContract: () => ({ shifts: [] }),
    config: () => ({
      shiftName1: 'Turno Dia',
      shiftTime1: '06:00',
      shiftEndTime1: '14:00',
      shiftName2: 'Turno Noche',
      shiftTime2: '18:00',
      shiftEndTime2: '06:00',
    }),
    isMaintenanceActive: () => false,
    isMaintenanceBlockingAccess: () => false,
    getMaintenanceAccessMessage: () =>
      'El sistema está en mantenimiento. Solo el rol SISTEMAS puede acceder en este momento.',
    login: async () => undefined,
    logout: async () => undefined,
    rejectMaintenanceAccessIfNeeded: async () => false,
    redirectToLogin() {},
    postLoginRoute: () => '/dashboard',
  };
  component.router = { navigate() {} } as any;
  component.notifications = { showError() {}, showWarning() {} } as any;
  component.username = '';
  component.password = '';
  component.selectedShiftCode = 'T1';
  component.showPassword = false;
  return component;
}

function createModeSelector() {
  const component = Object.create(ModeSelectorComponent.prototype) as ModeSelectorComponent & Record<string, any>;
  component.state = {
    canAccessManagerWorkspace: () => true,
    canHostOperatorPanel: () => true,
    managerHomeRoute: () => '/dashboard',
    homeRoute: () => '/operator',
    userName: () => 'Supervisor',
    userRole: () => 'Sistemas',
    currentShift: () => 'T1',
    config: () => ({ operatorMessage: 'Mensaje' }),
    canSwitchWorkspace: () => true,
    logout: async () => undefined,
    redirectToLogin() {},
  };
  component.router = { navigateByUrl: async () => true } as any;
  return component;
}

test('access module smoke imports login and mode selector components', () => {
  assert.equal(typeof LoginComponent, 'function');
  assert.equal(typeof ModeSelectorComponent, 'function');
});

test('login module supports DNI sanitization and shift selection', () => {
  const component = createLoginComponent();
  assert.equal(component.sanitizeDni('12a.34-5678'), '12345678');
  assert.equal(component.selectedShift, 'Turno Dia');
  assert.match(loginSource, /DNI del Usuario/);
  assert.match(loginSource, /Contraseña de Seguridad/);
  assert.match(loginSource, /Asignación de Turno/);
});

test('login module renders maintenance messaging from the real contract state', () => {
  const component = createLoginComponent();
  assert.equal(component.isMaintenanceActive, false);
  assert.equal(
    component.maintenanceMessage,
    'El sistema está en mantenimiento. Solo el rol SISTEMAS puede acceder en este momento.',
  );
  assert.match(loginSource, /Modo mantenimiento global/);
  assert.match(loginSource, /SISTEMA: EN MANTENIMIENTO/);
});

test('login module blocks non-sistemas access after authentication during maintenance', async () => {
  let loggedOut = false;
  let redirected = false;
  let warned = '';
  let navigated = false;
  const component = createLoginComponent();
  component.state = {
    ...component.state,
    isMaintenanceActive: () => true,
    isMaintenanceBlockingAccess: () => true,
    async rejectMaintenanceAccessIfNeeded() {
      loggedOut = true;
      warned =
        'El sistema está en mantenimiento. Solo el rol SISTEMAS puede acceder en este momento.';
      redirected = true;
      return true;
    },
  };
  component.router = {
    navigate() {
      navigated = true;
    },
  } as any;
  component.notifications = {
    showError() {},
    showWarning() {},
  } as any;
  component.username = '12345678';
  component.password = 'secret';

  await component.onLogin();

  assert.equal(loggedOut, true);
  assert.equal(redirected, true);
  assert.equal(navigated, false);
  assert.equal(
    warned,
    'El sistema está en mantenimiento. Solo el rol SISTEMAS puede acceder en este momento.',
  );
});

test('mode selector module supports workspace routing and logout', async () => {
  const component = createModeSelector();
  let redirected = '';
  const previousWindow = globalThis.window;
  (globalThis as any).window = {
    location: {
      origin: 'http://localhost:4200',
      pathname: '/',
      search: '',
      assign(url: string) {
        redirected = url;
      },
    },
  };

  try {
    component.router = { navigateByUrl: async () => false } as any;
    await component['navigateWithRecovery']('/dashboard');
    assert.equal(redirected, 'http://localhost:4200/#/dashboard');
    assert.match(modeSelectorSource, /Centro de Gestion/);
    assert.match(modeSelectorSource, /Terminal Operaria/);
  } finally {
    (globalThis as any).window = previousWindow;
  }
});
