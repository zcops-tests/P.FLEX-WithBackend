import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { DashboardComponent } from '../../../src/features/dashboard/dashboard.component';

const source = readFileSync(resolve(process.cwd(), 'src/features/dashboard/dashboard.component.ts'), 'utf8');

function createComponent() {
  const component = Object.create(DashboardComponent.prototype) as DashboardComponent & Record<string, any>;
  component.state = {
    pendingSyncCount: () => 2,
    syncStatus: () => 'online',
    adminMachines: () => [
      { id: 'm1', active: true, status: 'Activo' },
      { id: 'm2', active: false, status: 'Mantenimiento' },
    ],
    hasPermission: (permission: string) => permission !== 'quality.incidents.view',
  };
  component.ordersService = {
    ots: [
      { OT: 'OT-1', Estado_pedido: 'EN PROCESO', descripcion: 'Trabajo', maquina: 'IMP-01', total_mtl: 100 },
      { OT: 'OT-2', Estado_pedido: 'PENDIENTE' },
    ],
  };
  component.qualityService = {
    activeIncidents: [{ id: 'i1', priority: 'Alta', reportedAt: new Date(), title: 'Inc', description: 'Desc', machineRef: 'IMP-01' }],
  };
  component.production = {
    printReports: [{ totalMeters: 10 }],
    diecutReports: [{}],
    rewindReports: [{ meters: 5 }],
    packagingReports: [{ meters: 7 }],
  };
  component.audit = { logs: () => [{}, {}] };
  component.router = { navigate() {} };
  component.fileExport = {};
  component.notifications = {};
  component.showExportMenu = false;
  component.selectedOt = null;
  component.now = new Date();
  component.activeFeedTab = 'ALL';
  component.isLoadingDashboard = false;
  return component;
}

test('dashboard module smoke imports dashboard component', () => {
  assert.equal(typeof DashboardComponent, 'function');
});

test('dashboard module computes cards, feed and sync summary from operational data', () => {
  const component = createComponent();
  assert.equal(component.cards.length, 6);
  assert.equal(component.activeProduction.length, 1);
  assert.equal(component.activeIncidentsCount, 1);
  assert.equal(component.highPriorityCount, 1);
  assert.equal(component.reportMetrics.totalReports, 4);
  assert.equal(component.syncStatusLabel, '2 pendientes');
  assert.equal(component.feedItems.length >= 2, true);
});

test('dashboard module template keeps export and feed functionality visible', () => {
  assert.match(source, /Exportar/);
  assert.match(source, /PDF visual/);
  assert.match(source, /Excel datos/);
  assert.match(source, /Feed operativo/);
});
