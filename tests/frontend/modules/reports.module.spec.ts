import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ReportsPrintComponent } from '../../../src/features/reports/components/reports-print.component';
import { ReportsDiecutComponent } from '../../../src/features/reports/components/reports-diecut.component';
import { ReportsRewindComponent } from '../../../src/features/reports/components/reports-rewind.component';
import { ReportsPackagingComponent } from '../../../src/features/reports/components/reports-packaging.component';

const printSource = readFileSync(resolve(process.cwd(), 'src/features/reports/components/reports-print.component.ts'), 'utf8');
const diecutSource = readFileSync(resolve(process.cwd(), 'src/features/reports/components/reports-diecut.component.ts'), 'utf8');
const rewindSource = readFileSync(resolve(process.cwd(), 'src/features/reports/components/reports-rewind.component.ts'), 'utf8');
const packagingSource = readFileSync(resolve(process.cwd(), 'src/features/reports/components/reports-packaging.component.ts'), 'utf8');

test('reports module smoke imports all report components', () => {
  assert.equal(typeof ReportsPrintComponent, 'function');
  assert.equal(typeof ReportsDiecutComponent, 'function');
  assert.equal(typeof ReportsRewindComponent, 'function');
  assert.equal(typeof ReportsPackagingComponent, 'function');
});

test('reports module source preserves process report functionality', () => {
  assert.match(printSource, /impresi|print/i);
  assert.match(diecutSource, /troquel|diecut/i);
  assert.match(rewindSource, /rebobin|rewind/i);
  assert.match(packagingSource, /empaquet|packaging/i);
});

function createPrintReportsComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(ReportsPrintComponent.prototype) as ReportsPrintComponent & Record<string, any>;
  const navigationCalls: any[] = [];
  const notifications = {
    warnings: [] as string[],
    errors: [] as string[],
    showWarning(message: string) { this.warnings.push(message); },
    showError(message: string) { this.errors.push(message); },
  };
  const exportCalls: any[] = [];

  Object.assign(component, {
    reports: [],
    searchTerm: '',
    selectedReport: null,
    isDetailLoading: false,
    isExportingPdf: false,
    state: {
      hasPermission: () => true,
      canCreateProcessReport: () => true,
      hasActiveOperator: () => false,
      isProcessAllowedForActiveOperator: () => false,
    },
    router: {
      navigate(commands: any[]) {
        navigationCalls.push(commands);
        return Promise.resolve(true);
      },
    },
    notifications,
    production: {
      getPrintReport: async (id: string) => ({ id, ot: 'OT-DET', activities: [], die: { status: 'OK' }, clise: { status: 'OK' } }),
    },
    fileExport: {
      exportElementToPdf: async (...args: any[]) => { exportCalls.push(args); },
    },
    detailContent: { nativeElement: { id: 'detail-node' } },
    cdr: { detectChanges() {} },
    ...overrides,
  });

  return { component, navigationCalls, notifications, exportCalls };
}

function createPackagingReportsComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(ReportsPackagingComponent.prototype) as ReportsPackagingComponent & Record<string, any>;
  const navigationCalls: any[] = [];
  const notifications = {
    warnings: [] as string[],
    errors: [] as string[],
    successes: [] as string[],
    showWarning(message: string) { this.warnings.push(message); },
    showError(message: string) { this.errors.push(message); },
    showSuccess(message: string) { this.successes.push(message); },
  };
  const createCalls: any[] = [];
  const updateCalls: any[] = [];

  Object.assign(component, {
    reports: [],
    searchTerm: '',
    showForm: false,
    isOperatorMode: false,
    isSaving: false,
    otSuggestions: [],
    showOtSuggestions: false,
    currentReport: {
      id: null,
      date: '2026-04-05',
      ot: '',
      client: '',
      description: '',
      operator: 'Host User',
      shift: 'Turno Dia',
      status: 'Completo',
      rolls: null,
      meters: null,
      demasiaRolls: null,
      demasiaMeters: null,
      notes: '',
      workOrderId: null,
    },
    state: {
      hasPermission: () => true,
      canCreateProcessReport: () => true,
      hasActiveOperator: () => false,
      isProcessAllowedForActiveOperator: () => false,
      activeOperator: () => ({ id: 'op-1', name: 'Operario Uno' }),
      activeOperatorName: () => 'Operario Uno',
      userName: () => 'Host User',
      currentShift: () => 'Turno Dia',
      plantShifts: () => [{ id: 'shift-1', name: 'Turno Dia', code: 'DIA' }],
    },
    ordersService: {
      ots: [
        { OT: 'OT-1', 'Razon Social': 'Cliente Uno', descripcion: 'Trabajo Uno', Estado_pedido: 'PENDIENTE', id: 'wo-1' },
        { OT: 'OT-2', 'Razon Social': 'Cliente Dos', descripcion: 'Trabajo Dos', Estado_pedido: 'FINALIZADO', id: 'wo-2' },
      ],
      findWorkOrderByOtNumber: async (ot: string) => ({ id: `resolved-${ot}` }),
    },
    router: {
      navigate(commands: any[]) {
        navigationCalls.push(commands);
        return Promise.resolve(true);
      },
    },
    notifications,
    production: {
      createPackagingReport: async (payload: any) => { createCalls.push(payload); return { id: 'pkg-1' }; },
      updatePackagingReport: async (id: string, payload: any) => { updateCalls.push({ id, payload }); return { id }; },
      getPackagingReport: async (id: string) => ({
        id,
        date: new Date('2026-04-05T12:00:00Z'),
        ot: 'OT-EDIT',
        client: 'Cliente Edit',
        description: 'Trabajo Edit',
        operator: 'Supervisor',
        shift: 'Turno Dia',
        status: 'Completo',
        rolls: 10,
        meters: 1000,
        demasiaRolls: 1,
        demasiaMeters: 50,
        notes: 'Notas',
        workOrderId: 'wo-edit',
      }),
    },
    cdr: { detectChanges() {} },
    ...overrides,
  });

  return { component, navigationCalls, notifications, createCalls, updateCalls };
}

test('reports print filters records, computes KPIs and routes new report capture according to operator context', () => {
  const { component, navigationCalls, notifications } = createPrintReportsComponent({
    reports: [
      {
        id: 'r1',
        ot: 'OT-1',
        machine: 'IMP-01',
        operator: 'Ana Uno',
        client: 'Cliente Uno',
        totalMeters: 600,
        productionStatus: 'TOTAL',
        activities: [
          { startTime: '08:00', endTime: '09:00', meters: 0 },
          { startTime: '09:00', endTime: '10:00', meters: 600 },
        ],
        die: { status: 'OK' },
        clise: { status: 'OK' },
      },
      {
        id: 'r2',
        ot: 'OT-2',
        machine: 'IMP-02',
        operator: 'Ana Dos',
        client: 'Cliente Dos',
        totalMeters: 300,
        productionStatus: 'PARCIAL',
        activities: [{ startTime: '10:00', endTime: '11:30', meters: 300 }],
        die: { status: 'Desgaste' },
        clise: { status: 'OK' },
      },
    ],
    searchTerm: 'dos',
  });

  assert.equal(component.filteredReports.length, 1);
  assert.equal(component.kpis.totalMeters, 900);
  assert.equal(component.kpis.runEntries, 2);
  assert.equal(component.kpis.completedOts, 1);
  assert.equal(component.kpis.toolingIssues, 1);

  component.startNewReport();
  assert.deepEqual(navigationCalls[0], ['/operator']);
  assert.equal(notifications.warnings.length, 0);
});

test('reports print opens fallback detail and exports the selected report to PDF', async () => {
  const { component, notifications, exportCalls } = createPrintReportsComponent({
    production: {
      async getPrintReport() {
        throw new Error('detail unavailable');
      },
    },
  });
  const report = {
    id: 'r1',
    ot: 'OT/1 demo',
    machine: 'IMP-01',
    operator: 'Ana',
    client: 'Cliente',
    totalMeters: 100,
    productionStatus: 'TOTAL',
    activities: [],
    die: { status: 'OK' },
    clise: { status: 'OK' },
  };

  await component.openDetail(report as any);
  assert.equal(component.selectedReport, report);
  assert.match(notifications.errors[0] || '', /detail unavailable/i);

  await component.exportSelectedReportToPdf();
  assert.equal(exportCalls.length, 1);
  assert.match(exportCalls[0][1], /reporte_impresion_OT_1_demo\.pdf/i);
});

test('reports packaging suggests OTs, routes operator capture and blocks empty saves', async () => {
  const { component, navigationCalls, notifications } = createPackagingReportsComponent();

  component.startNewReport();
  assert.deepEqual(navigationCalls[0], ['/operator']);

  component.searchOt({ target: { value: 'cliente' } } as any);
  assert.equal(component.otSuggestions.length, 2);

  component.selectOt({ OT: 'OT-1', 'Razon Social': 'Cliente Uno', descripcion: 'Trabajo Uno', id: 'wo-1' });
  assert.equal(component.currentReport.ot, 'OT-1');
  assert.equal(component.currentReport.workOrderId, 'wo-1');

  await component.saveReport();
  assert.match(notifications.warnings[0] || '', /cantidad de rollos/i);
});

test('reports packaging saves operator reports, updates supervisor edits and resets/redirects correctly', async () => {
  const ctxOperator = createPackagingReportsComponent({
    isOperatorMode: true,
    currentReport: {
      id: null,
      date: '2026-04-05',
      ot: 'OT-1',
      client: 'Cliente Uno',
      description: 'Trabajo Uno',
      operator: 'Operario Uno',
      shift: 'Turno Dia',
      status: 'Completo',
      rolls: 12,
      meters: 1200,
      demasiaRolls: 1,
      demasiaMeters: 80,
      notes: 'Listo',
      workOrderId: 'wo-1',
    },
  });

  await ctxOperator.component.saveReport();
  assert.equal(ctxOperator.createCalls.length, 1);
  assert.equal(ctxOperator.createCalls[0].operator_id, 'op-1');
  assert.equal(ctxOperator.createCalls[0].lot_status, 'COMPLETE');
  assert.deepEqual(ctxOperator.navigationCalls.at(-1), ['/operator']);
  assert.match(ctxOperator.notifications.successes[0] || '', /guardado correctamente/i);

  const ctxManager = createPackagingReportsComponent({
    currentReport: {
      id: 'pkg-10',
      date: '2026-04-05',
      ot: 'OT-1',
      client: 'Cliente Uno',
      description: 'Trabajo Uno',
      operator: 'Supervisor',
      shift: 'Turno Dia',
      status: 'Parcial',
      rolls: 4,
      meters: 400,
      demasiaRolls: 0,
      demasiaMeters: 0,
      notes: '',
      workOrderId: 'wo-1',
    },
  });

  await ctxManager.component.saveReport();
  assert.equal(ctxManager.updateCalls.length, 1);
  assert.equal(ctxManager.updateCalls[0].id, 'pkg-10');
  assert.equal(ctxManager.updateCalls[0].payload.lot_status, 'PARTIAL');
  assert.equal(ctxManager.component.showForm, false);
});

test('reports packaging enforces operator mode access and prepares a suggested report shell', () => {
  const blocked = createPackagingReportsComponent({
    state: {
      hasPermission: () => false,
      canCreateProcessReport: () => false,
      hasActiveOperator: () => false,
      isProcessAllowedForActiveOperator: () => false,
      activeOperator: () => null,
      activeOperatorName: () => '',
      userName: () => 'Host User',
      currentShift: () => 'Turno Dia',
      plantShifts: () => [],
    },
  });

  assert.equal(blocked.component['canEnterOperatorMode'](), false);
  assert.deepEqual(blocked.navigationCalls[0], ['/operator']);

  const allowed = createPackagingReportsComponent({
    state: {
      hasPermission: () => true,
      canCreateProcessReport: () => true,
      hasActiveOperator: () => true,
      isProcessAllowedForActiveOperator: () => true,
      activeOperator: () => ({ id: 'op-1', name: 'Operario Uno' }),
      activeOperatorName: () => 'Operario Uno',
      userName: () => 'Host User',
      currentShift: () => 'Turno Dia',
      plantShifts: () => [],
    },
  });

  allowed.component['prepareOperatorReport']();
  assert.equal(allowed.component.showForm, true);
  assert.equal(allowed.component.currentReport.ot, 'OT-1');
  assert.equal(allowed.component.currentReport.operator, 'Operario Uno');
});
