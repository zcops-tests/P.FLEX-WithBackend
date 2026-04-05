import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { IncidentsComponent } from '../../../src/features/quality/components/incidents.component';

function createComponent(permissionMap: Record<string, boolean> = {}) {
  const component = Object.create(IncidentsComponent.prototype) as IncidentsComponent & Record<string, any>;
  const calls: string[] = [];
  component.service = {
    activeIncidents: [{ id: 'i1', actions: [], rootCause: '' }],
    closedIncidents: [{ id: 'i2', actions: [], rootCause: 'Causa' }],
    incidents: [{ id: 'i1', actions: [], rootCause: '' }],
    async addIncident() { calls.push('addIncident'); },
    async addCapaAction() { calls.push('addCapaAction'); },
    async toggleActionCompletion() { calls.push('toggleAction'); },
    async updateIncidentRootCause() { calls.push('updateRootCause'); return { id: 'i1', rootCause: 'Nueva causa' }; },
    async closeIncident() { calls.push('closeIncident'); },
  };
  component.state = {
    hasPermission(permission: string) {
      return Boolean(permissionMap[permission]);
    },
    userName: () => 'Supervisor',
  };
  component.notifications = {
    showWarning(message: string) { calls.push(`warn:${message}`); },
    async confirm() { calls.push('confirm'); return true; },
  };
  component.activeFilter = 'active';
  component.showCreateModal = false;
  component.selectedIncident = null;
  component.newIncidentData = { priority: 'Media', type: 'Maquinaria', assignedTo: 'Mantenimiento' };
  component.showAddAction = false;
  component.newActionData = { type: 'Correctiva', responsible: '', deadline: '' };
  component.__calls = calls;
  return component;
}

test('quality module smoke imports incidents component', () => {
  assert.equal(typeof IncidentsComponent, 'function');
});

test('quality module enforces creation and management permissions for incidents', async () => {
  const component = createComponent({
    'quality.incidents.create': true,
    'quality.incidents.manage': true,
  });
  component.openCreateModal();
  assert.equal(component.showCreateModal, true);
  component.newIncidentData.title = 'Incidencia';
  component.newIncidentData.description = 'Detalle';
  await component.createIncident();
  assert.ok(component.__calls.includes('addIncident'));
});

test('quality module blocks invalid incident creation and root-cause-less closure', async () => {
  const component = createComponent({
    'quality.incidents.create': true,
    'quality.incidents.manage': true,
  });
  await component.createIncident();
  assert.ok(component.__calls.some((item: string) => item.startsWith('warn:Complete el título')));
  component.selectedIncident = { id: 'i1', actions: [], rootCause: '' };
  await component.resolveIncident('i1');
  assert.ok(component.__calls.some((item: string) => item.startsWith('warn:Debe ingresar')));
});
