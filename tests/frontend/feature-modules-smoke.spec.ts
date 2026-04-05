import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';

const componentImports: Array<[string, string]> = [
  ['../../src/features/access/login.component', 'LoginComponent'],
  ['../../src/features/access/mode-selector.component', 'ModeSelectorComponent'],
  ['../../src/features/dashboard/dashboard.component', 'DashboardComponent'],
  ['../../src/features/orders/components/ot-list.component', 'OtListComponent'],
  ['../../src/features/orders/components/ot-import.component', 'OtImportComponent'],
  ['../../src/features/orders/components/ot-detail.component', 'OtDetailComponent'],
  ['../../src/features/orders/components/ot-form.component', 'OtFormComponent'],
  ['../../src/features/planning/schedule.component', 'ScheduleComponent'],
  ['../../src/features/reports/components/reports-print.component', 'ReportsPrintComponent'],
  ['../../src/features/reports/components/reports-diecut.component', 'ReportsDiecutComponent'],
  ['../../src/features/reports/components/reports-rewind.component', 'ReportsRewindComponent'],
  ['../../src/features/reports/components/reports-packaging.component', 'ReportsPackagingComponent'],
  ['../../src/features/inventory/components/inventory.component', 'InventoryComponent'],
  ['../../src/features/inventory/components/inventory-map.component', 'InventoryMapComponent'],
  ['../../src/features/inventory/components/inventory-clise.component', 'InventoryCliseComponent'],
  ['../../src/features/inventory/components/inventory-clise-detail-modal.component', 'InventoryCliseDetailModalComponent'],
  ['../../src/features/inventory/components/inventory-die.component', 'InventoryDieComponent'],
  ['../../src/features/inventory/components/inventory-stock.component', 'InventoryStockComponent'],
  ['../../src/features/inventory/components/inventory-ink.component', 'InventoryInkComponent'],
  ['../../src/features/quality/components/incidents.component', 'IncidentsComponent'],
  ['../../src/features/analytics/report-list.component', 'ReportListComponent'],
  ['../../src/features/audit/audit.component', 'AuditComponent'],
  ['../../src/features/admin/admin.component', 'AdminComponent'],
  ['../../src/features/admin/components/admin-users.component', 'AdminUsersComponent'],
  ['../../src/features/admin/components/admin-roles.component', 'AdminRolesComponent'],
  ['../../src/features/admin/components/admin-machines.component', 'AdminMachinesComponent'],
  ['../../src/features/admin/components/admin-config.component', 'AdminConfigComponent'],
  ['../../src/features/system/sync-center.component', 'SyncCenterComponent'],
  ['../../src/features/operator/operator-selector.component', 'OperatorSelectorComponent'],
  ['../../src/features/operator/operator-machine-selector.component', 'OperatorMachineSelectorComponent'],
  ['../../src/features/operator/operator-form.component', 'OperatorFormComponent'],
  ['../../src/features/production/production-print.component', 'ProductionPrintComponent'],
  ['../../src/features/production/production-diecut.component', 'ProductionDiecutComponent'],
  ['../../src/features/production/production-rewind.component', 'ProductionRewindComponent'],
  ['../../src/features/production/production-packaging.component', 'ProductionPackagingComponent'],
  ['../../src/core/layout/sidebar.component', 'SidebarComponent'],
  ['../../src/core/ui/notification-center.component', 'NotificationCenterComponent'],
];

for (const [modulePath, exportName] of componentImports) {
  test(`smoke imports ${exportName}`, async () => {
    const mod = await import(modulePath);
    assert.equal(typeof mod[exportName], 'function');
  });
}
