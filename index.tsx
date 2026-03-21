

import "zone.js"
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation, Routes } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
// import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

// Access Feature
import { LoginComponent } from './src/features/access/login.component';
import { ModeSelectorComponent } from './src/features/access/mode-selector.component';

// Core Features
import { DashboardComponent } from './src/features/dashboard/dashboard.component';
import { OtListComponent } from './src/features/orders/components/ot-list.component';
import { ScheduleComponent } from './src/features/planning/schedule.component';

// Production Features
import { ReportsPrintComponent } from './src/features/reports/components/reports-print.component';
import { ReportsDiecutComponent } from './src/features/reports/components/reports-diecut.component';
import { ReportsRewindComponent } from './src/features/reports/components/reports-rewind.component';
import { ReportsPackagingComponent } from './src/features/reports/components/reports-packaging.component';

// Inventory Feature
import { InventoryComponent } from './src/features/inventory/components/inventory.component';

// Quality & Analytics Features
import { IncidentsComponent } from './src/features/quality/components/incidents.component';
import { ReportListComponent } from './src/features/analytics/report-list.component';

// Admin & Audit Features
import { AuditComponent } from './src/features/audit/audit.component';
import { AdminComponent } from './src/features/admin/admin.component';
import { SyncCenterComponent } from './src/features/system/sync-center.component';

// Operator Feature
import { OperatorSelectorComponent } from './src/features/operator/operator-selector.component';
import { OperatorMachineSelectorComponent } from './src/features/operator/operator-machine-selector.component';
import { OperatorFormComponent } from './src/features/operator/operator-form.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'mode-selector', component: ModeSelectorComponent },
  
  // Manager Routes
  { path: 'dashboard', component: DashboardComponent },
  { path: 'ots', component: OtListComponent },
  { path: 'schedule', component: ScheduleComponent },
  { path: 'reports/print', component: ReportsPrintComponent },
  { path: 'reports/diecut', component: ReportsDiecutComponent },
  { path: 'reports/rewind', component: ReportsRewindComponent },
  { path: 'reports/packaging', component: ReportsPackagingComponent },
  { path: 'reports', redirectTo: 'reports/print', pathMatch: 'full' },
  { path: 'inventory/:type', component: InventoryComponent },
  { path: 'inventory', redirectTo: 'inventory/clise', pathMatch: 'full' },
  { path: 'incidents', component: IncidentsComponent },
  { path: 'reports', component: ReportListComponent },
  { path: 'audit', component: AuditComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'sync', component: SyncCenterComponent },

  // Operator Routes (Full Screen Flow)
  { path: 'operator', component: OperatorSelectorComponent },
  { path: 'operator/select-machine/:type', component: OperatorMachineSelectorComponent },
  { path: 'operator/packaging', component: ReportsPackagingComponent },
  { path: 'operator/report/:type/:machine', component: OperatorFormComponent },
  
  { path: '**', redirectTo: 'dashboard' }
];

bootstrapApplication(AppComponent, {
  providers: [
//   provideZonelessChangeDetection(),
    { provide: APP_BASE_HREF, useValue: '/' },
    provideRouter(routes, withHashLocation())
  ]
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
