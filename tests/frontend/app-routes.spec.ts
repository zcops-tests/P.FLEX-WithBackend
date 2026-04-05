import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const indexSource = readFileSync(
  resolve(process.cwd(), 'index.tsx'),
  'utf8',
);

test('router declares all visible manager and operator entrypoints', () => {
  const expectedPaths = [
    "path: 'login'",
    "path: 'mode-selector'",
    "path: 'dashboard'",
    "path: 'ots'",
    "path: 'schedule'",
    "path: 'reports/print'",
    "path: 'reports/diecut'",
    "path: 'reports/rewind'",
    "path: 'reports/packaging'",
    "path: 'inventory/:type'",
    "path: 'incidents'",
    "path: 'analytics'",
    "path: 'audit'",
    "path: 'admin'",
    "path: 'sync'",
    "path: 'operator'",
    "path: 'operator/select-machine/:type'",
    "path: 'operator/packaging'",
    "path: 'operator/report/:type/:machine'",
  ];

  expectedPaths.forEach((pathToken) => {
    assert.match(indexSource, new RegExp(pathToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('router wires each frontend module to its standalone component', () => {
  const expectedImports = [
    "login.component').then((m) => m.LoginComponent",
    "mode-selector.component').then((m) => m.ModeSelectorComponent",
    "dashboard.component').then((m) => m.DashboardComponent",
    "ot-list.component').then((m) => m.OtListComponent",
    "schedule.component').then((m) => m.ScheduleComponent",
    "reports-print.component').then((m) => m.ReportsPrintComponent",
    "reports-diecut.component').then((m) => m.ReportsDiecutComponent",
    "reports-rewind.component').then((m) => m.ReportsRewindComponent",
    "reports-packaging.component').then((m) => m.ReportsPackagingComponent",
    "inventory.component').then((m) => m.InventoryComponent",
    "incidents.component').then((m) => m.IncidentsComponent",
    "report-list.component').then((m) => m.ReportListComponent",
    "audit.component').then((m) => m.AuditComponent",
    "admin.component').then((m) => m.AdminComponent",
    "sync-center.component').then((m) => m.SyncCenterComponent",
    "operator-selector.component').then((m) => m.OperatorSelectorComponent",
    "operator-machine-selector.component').then((m) => m.OperatorMachineSelectorComponent",
    "operator-form.component').then((m) => m.OperatorFormComponent",
  ];

  expectedImports.forEach((importToken) => {
    assert.match(indexSource, new RegExp(importToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('inventory route preserves per-type permission mapping', () => {
  const expectedPermissions = [
    "layout: ['inventory.layout.view']",
    "clise: ['inventory.clises.view']",
    "die: ['inventory.dies.view']",
    "stock: ['inventory.stock.view']",
    "ink: ['inventory.ink.view']",
  ];

  expectedPermissions.forEach((token) => {
    assert.match(indexSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
