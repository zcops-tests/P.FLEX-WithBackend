import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { LoginComponent } from '../../src/features/access/login.component';
import { ModeSelectorComponent } from '../../src/features/access/mode-selector.component';
import { AdminComponent } from '../../src/features/admin/admin.component';
import { SidebarComponent } from '../../src/core/layout/sidebar.component';

function createLoginComponent(stateOverrides: Record<string, unknown> = {}) {
  const component = Object.create(LoginComponent.prototype) as LoginComponent & Record<string, any>;
  component.state = {
    systemConfigContract: () => ({
      shifts: [
        { code: 'T1', name: 'Turno Uno', startTime: '06:00', endTime: '14:00' },
        { code: 'T2', name: 'Turno Dos', startTime: '14:00', endTime: '22:00' },
      ],
    }),
    config: () => ({
      shiftName1: 'Fallback T1',
      shiftTime1: '06:00',
      shiftEndTime1: '14:00',
      shiftName2: 'Fallback T2',
      shiftTime2: '14:00',
      shiftEndTime2: '22:00',
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
    ...stateOverrides,
  };
  component.router = {
    navigate() {},
  } as any;
  component.notifications = {
    showError() {},
    showWarning() {},
  } as any;
  component.username = '';
  component.password = '';
  component.selectedShiftCode = 'T1';
  component.showPassword = false;
  return component;
}

function createModeSelector(stateOverrides: Record<string, unknown> = {}) {
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
    ...stateOverrides,
  };
  component.router = {
    navigateByUrl: async () => true,
  } as any;
  return component;
}

function createAdminComponent(permissionMap: Record<string, boolean>) {
  const component = Object.create(AdminComponent.prototype) as AdminComponent & Record<string, any>;
  component.state = {
    hasPermission(permission: string) {
      return Boolean(permissionMap[permission]);
    },
  };
  component.tabPermissions = {
    users: 'admin.users.manage',
    roles: 'admin.roles.manage',
    machines: 'admin.machines.manage',
    config: 'admin.config.manage',
  };
  component.activeTab = 'users';
  return component;
}

function createSidebar(stateOverrides: Record<string, unknown> = {}, qualityCount = 0, otCount = 0) {
  const component = Object.create(SidebarComponent.prototype) as SidebarComponent & Record<string, any>;
  component.state = {
    isSidebarCollapsed: () => false,
    toggleSidebar() {},
    hasAnyPermission: () => true,
    hasPermission: () => true,
    canSwitchWorkspace: () => true,
    environmentRoute: () => '/mode-selector',
    logout: async () => undefined,
    redirectToLogin() {},
    ...stateOverrides,
  };
  component.router = { navigate() {} } as any;
  component.qualityService = { activeIncidents: Array.from({ length: qualityCount }, (_, i) => i) };
  component.ordersService = { ots: Array.from({ length: otCount }, (_, i) => i) };
  component.apiClient = { baseUrl: 'http://localhost:3000' };
  component.expandedMenus = [];
  component.baseMenuItems = [
    { label: 'DASHBOARD', icon: 'dashboard', route: '/dashboard', permissions: ['dashboard.view'] },
    { label: 'OTS', icon: 'assignment', route: '/ots', permissions: ['workorders.view'] },
    { label: 'PROGRAMACIÓN', icon: 'calendar_month', route: '/schedule', permissions: ['planning.view'] },
    {
      label: 'REPORTES', icon: 'precision_manufacturing', route: '/reports',
      children: [
        { label: 'IMPRESIÓN', route: '/reports/print', permissions: ['reports.print.view'] },
        { label: 'TROQUELADO', route: '/reports/diecut', permissions: ['reports.diecut.view'] },
        { label: 'REBOBINADO', route: '/reports/rewind', permissions: ['reports.rewind.view'] },
        { label: 'EMPAQUETADO', route: '/reports/packaging', permissions: ['reports.packaging.view'] },
      ],
    },
    {
      label: 'INVENTARIO', icon: 'inventory_2', route: '/inventory',
      children: [
        { label: 'LAYOUT / MAPA', route: '/inventory/layout', permissions: ['inventory.layout.view'] },
        { label: 'CLISÉS', route: '/inventory/clise', permissions: ['inventory.clises.view'] },
        { label: 'TROQUELES', route: '/inventory/die', permissions: ['inventory.dies.view'] },
        { label: 'PRODUCTO TERMINADO', route: '/inventory/stock', permissions: ['inventory.stock.view'] },
        { label: 'TINTAS', route: '/inventory/ink', permissions: ['inventory.ink.view'] },
      ],
    },
  ];
  component.managementItems = [
    { label: 'INCIDENCIAS', icon: 'warning', route: '/incidents', permissions: ['quality.incidents.view'] },
    { label: 'INDICADORES', icon: 'analytics', route: '/analytics', permissions: ['analytics.view'] },
    { label: 'AUDITORÍA', icon: 'verified_user', route: '/audit', permissions: ['audit.view'] },
  ];
  component.isOnline = { set() {} };
  component.latency = { set() {} };
  return component;
}

test('login sanitizes DNI and resolves selected shift from contract config', () => {
  const component = createLoginComponent();

  assert.equal(component.sanitizeDni('12a.34-56b78'), '12345678');
  assert.equal(component.loginShifts[0].name, 'Turno Uno');
  assert.equal(component.selectedShift, 'Turno Uno');
});

test('login delegates authentication and routes to post-login workspace', async () => {
  let loginCall: any[] | null = null;
  let navigatedTo = '';
  const component = createLoginComponent({
    async login(username: string, shift: string, password: string) {
      loginCall = [username, shift, password];
    },
    postLoginRoute: () => '/mode-selector',
  });
  component.router = {
    navigate(route: string[]) {
      navigatedTo = route[0];
    },
  } as any;
  component.username = '12345678';
  component.password = 'secret';

  await component.onLogin();

  assert.deepEqual(loginCall, ['12345678', 'Turno Uno', 'secret']);
  assert.equal(navigatedTo, '/mode-selector');
});

test('mode selector hard redirects when router navigation reports failure', async () => {
  const component = createModeSelector();
  let assigned = '';
  const previousWindow = globalThis.window;
  (globalThis as any).window = {
    location: {
      origin: 'http://localhost:4200',
      pathname: '/',
      search: '',
      assign(url: string) {
        assigned = url;
      },
    },
  };
  component.router = {
    navigateByUrl: async () => false,
  } as any;

  try {
    await component['navigateWithRecovery']('/dashboard');
    assert.equal(assigned, 'http://localhost:4200/#/dashboard');
  } finally {
    (globalThis as any).window = previousWindow;
  }
});

test('mode selector logout clears the session and redirects to login', async () => {
  let loggedOut = false;
  let redirected = false;
  const component = createModeSelector({
    async logout() {
      loggedOut = true;
    },
    redirectToLogin() {
      redirected = true;
    },
  });

  await component.logout();

  assert.equal(loggedOut, true);
  assert.equal(redirected, true);
});

test('admin component selects the first permitted tab and blocks unauthorized tabs', () => {
  const component = createAdminComponent({
    'admin.users.manage': false,
    'admin.roles.manage': true,
    'admin.machines.manage': false,
    'admin.config.manage': true,
  });

  component.activeTab = component['getDefaultTab']();
  assert.equal(component.activeTab, 'roles');

  component.selectTab('users');
  assert.equal(component.activeTab, 'roles');

  component.selectTab('config');
  assert.equal(component.activeTab, 'config');
});

test('sidebar builds menu badges and context switch labels from current state', () => {
  const component = createSidebar({}, 3, 5);

  assert.equal(component.getInitials('Pedro Flex'), 'PE');
  assert.equal(component.contextSwitcherLabel(), 'CAMBIAR ENTORNO...');
  assert.equal(component.contextSwitcherIcon(), 'swap_horiz');
  assert.equal(component.canAccessConfiguration(), true);
  assert.equal(component.mainMenuItems.find((item: any) => item.label === 'OTS')?.badge, '5');
  assert.equal(
    component.managementMenuItems.find((item: any) => item.label === 'INCIDENCIAS')?.badge,
    '3',
  );
});

test('sidebar toggles submenus and respects visible children by permissions', () => {
  const component = createSidebar(
    {
      hasAnyPermission(permissions: string[]) {
        return permissions.includes('inventory.stock.view') || permissions.includes('workorders.view');
      },
    },
    0,
    0,
  );

  component.toggleSubmenu('REPORTES');
  assert.equal(component.isExpanded('REPORTES'), true);
  component.toggleSubmenu('REPORTES');
  assert.equal(component.isExpanded('REPORTES'), false);

  const inventoryItem = component['baseMenuItems'].find((item: any) => item.label === 'INVENTARIO');
  const visibleChildren = component.getVisibleChildren(inventoryItem);
  assert.deepEqual(
    visibleChildren.map((item: any) => item.route),
    ['/inventory/stock'],
  );
});
