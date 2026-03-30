import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { APP_BASE_HREF } from '@angular/common';
import { provideRouter, Routes, withHashLocation } from '@angular/router';
// import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';
import { authGuard, guestGuard, inventoryRoleGuard, roleGuard } from './src/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./src/features/access/login.component').then((m) => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'mode-selector', loadComponent: () => import('./src/features/access/mode-selector.component').then((m) => m.ModeSelectorComponent), canActivate: [authGuard] },

  // Manager Routes
  { path: 'dashboard', loadComponent: () => import('./src/features/dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['dashboard.view'] } },
  { path: 'ots', loadComponent: () => import('./src/features/orders/components/ot-list.component').then((m) => m.OtListComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['workorders.view'] } },
  { path: 'schedule', loadComponent: () => import('./src/features/planning/schedule.component').then((m) => m.ScheduleComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['planning.view'] } },
  { path: 'reports/print', loadComponent: () => import('./src/features/reports/components/reports-print.component').then((m) => m.ReportsPrintComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['reports.print.view'] } },
  { path: 'reports/diecut', loadComponent: () => import('./src/features/reports/components/reports-diecut.component').then((m) => m.ReportsDiecutComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['reports.diecut.view'] } },
  { path: 'reports/rewind', loadComponent: () => import('./src/features/reports/components/reports-rewind.component').then((m) => m.ReportsRewindComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['reports.rewind.view'] } },
  { path: 'reports/packaging', loadComponent: () => import('./src/features/reports/components/reports-packaging.component').then((m) => m.ReportsPackagingComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['reports.packaging.view'] } },
  { path: 'reports', redirectTo: 'reports/print', pathMatch: 'full' },
  { path: 'inventory/:type', loadComponent: () => import('./src/features/inventory/components/inventory.component').then((m) => m.InventoryComponent), canActivate: [authGuard, inventoryRoleGuard], data: { permissionsByType: {
    layout: ['inventory.layout.view'],
    clise: ['inventory.clises.view'],
    die: ['inventory.dies.view'],
    stock: ['inventory.stock.view'],
    ink: ['inventory.ink.view'],
  } } },
  { path: 'inventory', redirectTo: 'inventory/layout', pathMatch: 'full' },
  { path: 'incidents', loadComponent: () => import('./src/features/quality/components/incidents.component').then((m) => m.IncidentsComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['quality.incidents.view'] } },
  { path: 'analytics', loadComponent: () => import('./src/features/analytics/report-list.component').then((m) => m.ReportListComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['analytics.view'] } },
  { path: 'audit', loadComponent: () => import('./src/features/audit/audit.component').then((m) => m.AuditComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['audit.view'] } },
  { path: 'admin', loadComponent: () => import('./src/features/admin/admin.component').then((m) => m.AdminComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['admin.panel.view'] } },
  { path: 'sync', loadComponent: () => import('./src/features/system/sync-center.component').then((m) => m.SyncCenterComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['sync.manage'] } },

  // Operator Routes
  { path: 'operator', loadComponent: () => import('./src/features/operator/operator-selector.component').then((m) => m.OperatorSelectorComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['operator.host'] } },
  { path: 'operator/select-machine/:type', loadComponent: () => import('./src/features/operator/operator-machine-selector.component').then((m) => m.OperatorMachineSelectorComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['operator.host'] } },
  { path: 'operator/packaging', loadComponent: () => import('./src/features/reports/components/reports-packaging.component').then((m) => m.ReportsPackagingComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['operator.host'] } },
  { path: 'operator/report/:type/:machine', loadComponent: () => import('./src/features/operator/operator-form.component').then((m) => m.OperatorFormComponent), canActivate: [authGuard, roleGuard], data: { permissions: ['operator.host'] } },

  { path: '**', redirectTo: 'dashboard' }
];

bootstrapApplication(AppComponent, {
  providers: [
//   provideZonelessChangeDetection(),
    { provide: APP_BASE_HREF, useValue: '/' },
    provideRouter(routes, withHashLocation())
  ]
}).catch((err) => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
