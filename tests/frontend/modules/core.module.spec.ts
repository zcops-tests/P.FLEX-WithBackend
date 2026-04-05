import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { SidebarComponent } from '../../../src/core/layout/sidebar.component';
import { NotificationCenterComponent } from '../../../src/core/ui/notification-center.component';

function createSidebar() {
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
  };
  component.router = { navigate() {} } as any;
  component.qualityService = { activeIncidents: [1, 2] };
  component.ordersService = { ots: [1, 2, 3] };
  component.apiClient = { baseUrl: 'http://localhost:3000' };
  component.expandedMenus = [];
  component.baseMenuItems = [
    { label: 'OTS', icon: 'assignment', route: '/ots', permissions: ['workorders.view'] },
  ];
  component.managementItems = [
    { label: 'INCIDENCIAS', icon: 'warning', route: '/incidents', permissions: ['quality.incidents.view'] },
  ];
  component.isOnline = { set() {} };
  component.latency = { set() {} };
  return component;
}

test('core module smoke imports sidebar and notification center', () => {
  assert.equal(typeof SidebarComponent, 'function');
  assert.equal(typeof NotificationCenterComponent, 'function');
});

test('core module sidebar supports badges and submenu toggling', () => {
  const component = createSidebar();
  assert.equal(component.mainMenuItems[0].badge, '3');
  assert.equal(component.managementMenuItems[0].badge, '2');
  component.toggleSubmenu('OTS');
  assert.equal(component.isExpanded('OTS'), true);
});
