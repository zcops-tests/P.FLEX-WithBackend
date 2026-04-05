import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ProductionPrintComponent } from '../../../src/features/production/production-print.component';
import { ProductionDiecutComponent } from '../../../src/features/production/production-diecut.component';
import { ProductionRewindComponent } from '../../../src/features/production/production-rewind.component';
import { ProductionPackagingComponent } from '../../../src/features/production/production-packaging.component';

const printSource = readFileSync(resolve(process.cwd(), 'src/features/production/production-print.component.ts'), 'utf8');
const diecutSource = readFileSync(resolve(process.cwd(), 'src/features/production/production-diecut.component.ts'), 'utf8');
const rewindSource = readFileSync(resolve(process.cwd(), 'src/features/production/production-rewind.component.ts'), 'utf8');
const packagingSource = readFileSync(resolve(process.cwd(), 'src/features/production/production-packaging.component.ts'), 'utf8');

test('production module smoke imports process-specific production screens', () => {
  assert.equal(typeof ProductionPrintComponent, 'function');
  assert.equal(typeof ProductionDiecutComponent, 'function');
  assert.equal(typeof ProductionRewindComponent, 'function');
  assert.equal(typeof ProductionPackagingComponent, 'function');
});

test('production module source preserves process-specific production workflows', () => {
  assert.match(printSource, /impresi|print/i);
  assert.match(diecutSource, /troquel|diecut/i);
  assert.match(rewindSource, /rebobin|rewind/i);
  assert.match(packagingSource, /empaquet|packaging/i);
});

function createProductionPrintComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(ProductionPrintComponent.prototype) as ProductionPrintComponent & Record<string, any>;
  Object.assign(component, {
    reports: [],
    searchTerm: '',
    selectedReport: null,
    ...overrides,
  });
  return component;
}

function createProductionPackagingComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(ProductionPackagingComponent.prototype) as ProductionPackagingComponent & Record<string, any>;
  const navigationCalls: any[] = [];
  Object.assign(component, {
    isOperatorMode: false,
    showForm: false,
    currentReport: {},
    showOtSuggestions: false,
    otSuggestions: [],
    state: {
      userName: () => 'Host User',
      currentShift: () => 'Turno Dia',
    },
    ordersService: {
      ots: [
        { OT: 'OT-1', 'Razon Social': 'Cliente Uno', descripcion: 'Trabajo Uno', Estado_pedido: 'EN PROCESO' },
        { OT: 'OT-2', 'Razon Social': 'Cliente Dos', descripcion: 'Trabajo Dos', Estado_pedido: 'FINALIZADO' },
      ],
    },
    router: {
      url: '/reports/packaging',
      navigate(commands: any[]) {
        navigationCalls.push(commands);
        return Promise.resolve(true);
      },
    },
    ...overrides,
  });

  return { component, navigationCalls };
}

test('production print filters mock reports, computes KPIs and manages detail state', () => {
  const component = createProductionPrintComponent({
    reports: [
      {
        id: 'r1',
        ot: 'OT-1',
        client: 'Cliente Uno',
        machine: 'IMP-01',
        operator: 'Ana Uno',
        totalMeters: 1000,
        productionStatus: 'TOTAL',
        activities: [{ startTime: '08:00', endTime: '09:30', meters: 1000 }],
        die: { status: 'OK' },
        clise: { status: 'Desgaste' },
      },
      {
        id: 'r2',
        ot: 'OT-2',
        client: 'Cliente Dos',
        machine: 'IMP-02',
        operator: 'Carlos Dos',
        totalMeters: 500,
        productionStatus: 'PARCIAL',
        activities: [{ startTime: '10:00', endTime: '11:00', meters: 500 }],
        die: { status: 'Dañado' },
        clise: { status: 'OK' },
      },
    ],
    searchTerm: 'carlos',
  });

  assert.equal(component.filteredReports.length, 1);
  assert.equal(component.kpis.totalMeters, 1500);
  assert.equal(component.kpis.completedOts, 1);
  assert.equal(component.kpis.toolingIssues, 2);
  assert.equal(component.getStatusClass('Dañado'), 'bg-red-500/10 text-red-400 border-red-500/20');
  assert.equal(component.calculateDuration('23:30', '00:15'), '0h 45m');

  component.openDetail(component.reports[0]);
  assert.equal(component.selectedReport?.id, 'r1');
  component.closeDetail();
  assert.equal(component.selectedReport, null);
});

test('production packaging creates, edits, searches and closes reports according to mode', () => {
  const { component } = createProductionPackagingComponent();

  component.createNewReport();
  assert.equal(component.showForm, true);
  assert.equal(component.currentReport.ot, 'OT-1');

  component.searchOt({ target: { value: 'cliente' } });
  assert.equal(component.otSuggestions.length, 2);
  component.selectOt({ OT: 'OT-2', 'Razon Social': 'Cliente Dos', descripcion: 'Trabajo Dos' });
  assert.equal(component.currentReport.ot, 'OT-2');
  assert.equal(component.showOtSuggestions, false);

  component.editReport({
    id: 'pkg-1',
    date: new Date('2026-04-05T12:00:00Z'),
    ot: 'OT-EDIT',
    client: 'Cliente Edit',
    description: 'Trabajo Edit',
    operator: 'Supervisor',
    shift: 'Turno Noche',
  });
  assert.equal(component.currentReport.id, 'pkg-1');
  assert.equal(component.currentReport.date, '2026-04-05');

  component.closeForm();
  assert.equal(component.showForm, false);

  const operatorMode = createProductionPackagingComponent({
    isOperatorMode: true,
  });
  operatorMode.component.closeForm();
  assert.deepEqual(operatorMode.navigationCalls[0], ['/operator']);
});
