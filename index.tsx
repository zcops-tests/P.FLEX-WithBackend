import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { APP_BASE_HREF } from '@angular/common';
import { provideRouter, Routes, withHashLocation } from '@angular/router';
// import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';
import { authGuard, guestGuard, roleGuard } from './src/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./src/features/access/login.component').then((m) => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'mode-selector', loadComponent: () => import('./src/features/access/mode-selector.component').then((m) => m.ModeSelectorComponent), canActivate: [guestGuard] },

  // Manager Routes
  { path: 'dashboard', loadComponent: () => import('./src/features/dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'ots', loadComponent: () => import('./src/features/orders/components/ot-list.component').then((m) => m.OtListComponent), canActivate: [authGuard] },
  { path: 'schedule', loadComponent: () => import('./src/features/planning/schedule.component').then((m) => m.ScheduleComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente'] } },
  { path: 'reports/print', loadComponent: () => import('./src/features/reports/components/reports-print.component').then((m) => m.ReportsPrintComponent), canActivate: [authGuard] },
  { path: 'reports/diecut', loadComponent: () => import('./src/features/reports/components/reports-diecut.component').then((m) => m.ReportsDiecutComponent), canActivate: [authGuard] },
  { path: 'reports/rewind', loadComponent: () => import('./src/features/reports/components/reports-rewind.component').then((m) => m.ReportsRewindComponent), canActivate: [authGuard] },
  { path: 'reports/packaging', loadComponent: () => import('./src/features/reports/components/reports-packaging.component').then((m) => m.ReportsPackagingComponent), canActivate: [authGuard] },
  { path: 'reports', redirectTo: 'reports/print', pathMatch: 'full' },
  { path: 'inventory/:type', loadComponent: () => import('./src/features/inventory/components/inventory.component').then((m) => m.InventoryComponent), canActivate: [authGuard] },
  { path: 'inventory', redirectTo: 'inventory/clise', pathMatch: 'full' },
  { path: 'incidents', loadComponent: () => import('./src/features/quality/components/incidents.component').then((m) => m.IncidentsComponent), canActivate: [authGuard] },
  { path: 'analytics', loadComponent: () => import('./src/features/analytics/report-list.component').then((m) => m.ReportListComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Sistemas', 'Jefatura', 'Supervisor'] } },
  { path: 'audit', loadComponent: () => import('./src/features/audit/audit.component').then((m) => m.AuditComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Sistemas', 'Jefatura', 'Supervisor'] } },
  { path: 'admin', loadComponent: () => import('./src/features/admin/admin.component').then((m) => m.AdminComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Sistemas'] } },
  { path: 'sync', loadComponent: () => import('./src/features/system/sync-center.component').then((m) => m.SyncCenterComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Sistemas', 'Jefatura', 'Supervisor'] } },

  // Operator Routes
  { path: 'operator', loadComponent: () => import('./src/features/operator/operator-selector.component').then((m) => m.OperatorSelectorComponent), canActivate: [authGuard] },
  { path: 'operator/select-machine/:type', loadComponent: () => import('./src/features/operator/operator-machine-selector.component').then((m) => m.OperatorMachineSelectorComponent), canActivate: [authGuard] },
  { path: 'operator/packaging', loadComponent: () => import('./src/features/reports/components/reports-packaging.component').then((m) => m.ReportsPackagingComponent), canActivate: [authGuard] },
  { path: 'operator/report/:type/:machine', loadComponent: () => import('./src/features/operator/operator-form.component').then((m) => m.OperatorFormComponent), canActivate: [authGuard] },

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
