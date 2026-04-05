import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { OperatorSelectorComponent } from '../../../src/features/operator/operator-selector.component';
import { OperatorMachineSelectorComponent } from '../../../src/features/operator/operator-machine-selector.component';
import { OperatorFormComponent } from '../../../src/features/operator/operator-form.component';

const selectorSource = readFileSync(resolve(process.cwd(), 'src/features/operator/operator-selector.component.ts'), 'utf8');
const machineSource = readFileSync(resolve(process.cwd(), 'src/features/operator/operator-machine-selector.component.ts'), 'utf8');
const formSource = readFileSync(resolve(process.cwd(), 'src/features/operator/operator-form.component.ts'), 'utf8');

test('operator module smoke imports selector, machine selector and form', () => {
  assert.equal(typeof OperatorSelectorComponent, 'function');
  assert.equal(typeof OperatorMachineSelectorComponent, 'function');
  assert.equal(typeof OperatorFormComponent, 'function');
});

test('operator module supports operator identification and machine/process selection', () => {
  assert.match(selectorSource, /operario|identific/i);
  assert.match(machineSource, /machine|máquina|maquina/i);
  assert.match(formSource, /report|producci|registro/i);
});

function createSelectorComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(OperatorSelectorComponent.prototype) as OperatorSelectorComponent & Record<string, any>;
  const navigationCalls: any[] = [];
  const notifications = {
    warnings: [] as string[],
    errors: [] as string[],
    successes: [] as string[],
    showWarning(message: string) { this.warnings.push(message); },
    showError(message: string) { this.errors.push(message); },
    showSuccess(message: string) { this.successes.push(message); },
  };

  Object.assign(component, {
    state: {
      hasActiveOperator: () => false,
      canCreateProcessReport: () => true,
      isProcessAllowedForActiveOperator: () => false,
      identifyOperatorByDni: async () => undefined,
      activeOperatorName: () => 'Juan Perez',
      clearActiveOperatorContext() {},
    },
    router: {
      navigate(commands: any[]) {
        navigationCalls.push(commands);
        return Promise.resolve(true);
      },
    },
    notifications,
    operatorDni: '',
    identifyingOperator: false,
    ...overrides,
  });

  return { component, navigationCalls, notifications };
}

function createMachineSelectorComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(OperatorMachineSelectorComponent.prototype) as OperatorMachineSelectorComponent & Record<string, any>;
  const navigationCalls: any[] = [];
  const notifications = {
    errors: [] as string[],
    showError(message: string) { this.errors.push(message); },
  };

  Object.assign(component, {
    type: 'print',
    state: {
      canCreateProcessReport: () => true,
      isMachineAllowedForActiveOperator: (machine: any, type: string) => machine.allowedFor?.includes(type) ?? true,
      adminMachines: () => [],
    },
    router: {
      navigate(commands: any[]) {
        navigationCalls.push(commands);
        return Promise.resolve(true);
      },
    },
    notifications,
    ...overrides,
  });

  return { component, navigationCalls, notifications };
}

function createOperatorFormComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(OperatorFormComponent.prototype) as OperatorFormComponent & Record<string, any>;
  const navigationCalls: any[] = [];
  const notifications = {
    warnings: [] as string[],
    errors: [] as string[],
    successes: [] as string[],
    showWarning(message: string) { this.warnings.push(message); },
    showError(message: string) { this.errors.push(message); },
    showSuccess(message: string) { this.successes.push(message); },
  };
  const auditCalls: any[] = [];
  const productionCalls = {
    print: [] as any[],
    diecut: [] as any[],
    rewind: [] as any[],
  };
  let resetCalls = 0;

  Object.assign(component, {
    type: 'print',
    machineName: 'IMP-01',
    otSearch: '',
    showSuggestions: false,
    selectedOt: null,
    reportActivities: [],
    diecutReportActivities: [],
    currentActivity: { type: 'Impresión', startTime: '08:00', endTime: '', meters: null },
    currentDiecutActivity: { type: 'TROQUELADO', startTime: '08:00', endTime: '', meters: null, observations: '' },
    formData: {
      cliseItem: '',
      dieType: '',
      dieSeries: '',
      dieLocation: '',
      cliseStatus: 'OK',
      dieStatus: 'OK',
      productionStatus: 'PARCIAL',
      observations: '',
      notes: '',
      goodQty: null,
      labelsPerRoll: null,
      waste: null,
      frequency: '',
    },
    state: {
      canCreateProcessReport: () => true,
      activeOperator: () => ({ id: 'op-1', name: 'Operario Uno' }),
      activeOperatorName: () => 'Operario Uno',
      activeOperatorDni: () => '12345678',
      currentShift: () => 'Turno Dia',
      plantShifts: () => [{ id: 'shift-1', name: 'Turno Dia', code: 'DIA' }],
      adminMachines: () => [
        { id: 'm1', name: 'IMP-01', type: 'Impresión' },
        { id: 'm2', name: 'TRQ-01', type: 'Troquelado' },
        { id: 'm3', name: 'REW-01', type: 'Rebobinado' },
      ],
      userName: () => 'Host User',
      userRole: () => 'HOST',
    },
    router: {
      navigate(commands: any[]) {
        navigationCalls.push(commands);
        return Promise.resolve(true);
      },
    },
    notifications,
    ordersService: {
      ots: [
        { OT: 'OT-100', 'Razon Social': 'Cliente A', descripcion: 'Trabajo A', troquel: 'TR-01', id: 'wo-100', total_mtl: 5000 },
        { OT: 'OT-200', 'Razon Social': 'Cliente B', descripcion: 'Trabajo B', troquel: 'TR-02', id: 'wo-200', total_mtl: 2000 },
      ],
      findWorkOrderByOtNumber: async (ot: string) => ({ id: `resolved-${ot}` }),
    },
    production: {
      async createPrintReport(payload: any) {
        productionCalls.print.push(payload);
        return { id: 'print-1', totalMeters: 1000 };
      },
      async createDiecutReport(payload: any) {
        productionCalls.diecut.push(payload);
        return { id: 'diecut-1', goodUnits: 400 };
      },
      async createRewindReport(payload: any) {
        productionCalls.rewind.push(payload);
        return { id: 'rewind-1', rolls: payload.rolls_finished };
      },
    },
    audit: {
      log(...args: any[]) {
        auditCalls.push(args);
      },
    },
    cdr: { detectChanges() {} },
    destroyRef: {},
    route: { params: { subscribe() {} } },
    resetForm() {
      resetCalls += 1;
    },
    isSubmitting: false,
    ...overrides,
  });

  return { component, navigationCalls, notifications, auditCalls, productionCalls, get resetCalls() { return resetCalls; } };
}

test('operator selector blocks navigation until an operator is identified', () => {
  const { component, navigationCalls, notifications } = createSelectorComponent();

  component.navigateTo('print');

  assert.equal(navigationCalls.length, 0);
  assert.match(notifications.warnings[0] || '', /identifica primero al operario/i);
});

test('operator selector routes packaging directly and exposes access only when all checks pass', () => {
  const { component, navigationCalls } = createSelectorComponent({
    state: {
      hasActiveOperator: () => true,
      canCreateProcessReport: (type: string) => type === 'packaging',
      isProcessAllowedForActiveOperator: (type: string) => type === 'packaging',
    },
  });

  assert.equal(component.canAccessProcess('packaging'), true);
  assert.equal(component.canAccessProcess('print'), false);

  component.navigateTo('packaging');

  assert.deepEqual(navigationCalls[0], ['/operator/packaging']);
});

test('operator selector validates DNI before identification and reports success after resolving the operator', async () => {
  let receivedDni = '';
  const { component, notifications } = createSelectorComponent({
    state: {
      identifyOperatorByDni: async (dni: string) => { receivedDni = dni; },
      activeOperatorName: () => 'Maria Operaria',
    },
  });

  component.operatorDni = '123';
  await component.identifyOperator();
  assert.match(notifications.warnings[0] || '', /dni válido/i);

  component.operatorDni = '12345678';
  await component.identifyOperator();

  assert.equal(receivedDni, '12345678');
  assert.equal(component.identifyingOperator, false);
  assert.match(notifications.successes[0] || '', /maria operaria/i);
});

test('operator machine selector filters machines by type and navigates only for active allowed machines', () => {
  const { component, navigationCalls } = createMachineSelectorComponent({
    type: 'print',
    state: {
      canCreateProcessReport: () => true,
      isMachineAllowedForActiveOperator: (machine: any, type: string) => machine.allowedFor?.includes(type) ?? false,
      adminMachines: () => [
        { id: '1', name: 'IMP-01', type: 'Impresión', status: 'Activo', allowedFor: ['print'] },
        { id: '2', name: 'IMP-02', type: 'Impresión', status: 'Detenida', allowedFor: ['print'] },
        { id: '3', name: 'TRQ-01', type: 'Troquelado', status: 'Activo', allowedFor: ['diecut'] },
      ],
    },
  });

  assert.equal(component.machines.length, 2);
  assert.equal(component.machines[0].name, 'IMP-01');

  component.selectMachine(component.machines[1]);
  assert.equal(navigationCalls.length, 0);

  component.selectMachine(component.machines[0]);
  assert.deepEqual(navigationCalls[0], ['/operator/report', 'print', 'IMP-01']);
});

test('operator form suggests OTs, copies die series and chains activities', () => {
  const { component } = createOperatorFormComponent();

  component.otSearch = 'ot';
  const suggestions = component.filteredOts;
  assert.equal(suggestions.length, 2);

  component.selectOt({ OT: 'OT-100', 'Razon Social': 'Cliente A', descripcion: 'Trabajo A', troquel: 'TR-01' });
  assert.equal(component.otSearch, 'OT-100');
  assert.equal(component.formData.dieSeries, 'TR-01');

  component.currentActivity = { type: 'Impresión', startTime: '08:00', endTime: '09:00', meters: 120 };
  component.addActivity();
  assert.equal(component.reportActivities.length, 1);
  assert.equal(component.currentActivity.startTime, '09:00');
});

test('operator form validates print die data and resolves machines by process name', () => {
  const { component } = createOperatorFormComponent();

  assert.match(component['validatePrintDieData']() || '', /tipo de troquel/i);

  component.formData.dieType = 'MAGNETIC';
  assert.match(component['validatePrintDieData']() || '', /troquel magnético/i);

  component.formData.dieSeries = 'SER-01';
  assert.equal(component['validatePrintDieData'](), null);

  component.type = 'print';
  component.machineName = ' imp-01 ';
  assert.equal(component['resolveCurrentMachine']()?.id, 'm1');

  component.type = 'diecut';
  component.machineName = 'TRQ-01';
  assert.equal(component['resolveCurrentMachine']()?.id, 'm2');
});

test('operator form prevents submitting process reports without an active operator', async () => {
  const { component, navigationCalls, notifications } = createOperatorFormComponent({
    state: {
      canCreateProcessReport: () => true,
      activeOperator: () => null,
      currentShift: () => 'Turno Dia',
      plantShifts: () => [],
      adminMachines: () => [{ id: 'm1', name: 'IMP-01', type: 'Impresión' }],
      userName: () => 'Host User',
      userRole: () => 'HOST',
    },
    selectedOt: { OT: 'OT-100', 'Razon Social': 'Cliente A' },
  });

  await component.submitReport();

  assert.match(notifications.warnings[0] || '', /identifica primero al operario/i);
  assert.deepEqual(navigationCalls[0], ['/operator']);
});

test('operator form submits print reports with normalized payload and resets the flow', async () => {
  const ctx = createOperatorFormComponent({
    type: 'print',
    selectedOt: { OT: 'OT-100', 'Razon Social': 'Cliente A', id: 'wo-100' },
    reportActivities: [
      { type: 'Setup', startTime: '08:00', endTime: '08:30', meters: 0 },
      { type: 'Impresión', startTime: '08:30', endTime: '09:45', meters: 500 },
    ],
  });
  const { component, notifications, productionCalls, auditCalls } = ctx;
  component.formData.dieType = 'MAGNETIC';
  component.formData.dieSeries = 'SER-01';
  component.formData.cliseItem = 'CL-01';

  await component.submitReport();

  assert.equal(productionCalls.print.length, 1);
  assert.equal(productionCalls.print[0].activities[0].activity_type, 'SETUP');
  assert.equal(productionCalls.print[0].activities[1].activity_type, 'RUN');
  assert.equal(productionCalls.print[0].activities[1].duration_minutes, 75);
  assert.equal(productionCalls.print[0].die_series, 'SER-01');
  assert.match(notifications.successes[0] || '', /impresión print-1 guardado correctamente/i);
  assert.equal(auditCalls.length, 1);
  assert.equal(ctx.resetCalls, 1);
  assert.equal(component.selectedOt, null);
});

test('operator form requires labels per roll before rewind submission', async () => {
  const { component, notifications, productionCalls } = createOperatorFormComponent({
    type: 'rewind',
    machineName: 'REW-01',
    selectedOt: { OT: 'OT-100', 'Razon Social': 'Cliente A', total_mtl: 2500 },
  });
  component.formData.goodQty = 5;
  component.formData.labelsPerRoll = 0;

  await component.submitReport();

  assert.match(notifications.warnings[0] || '', /etiquetas por rollo/i);
  assert.equal(productionCalls.rewind.length, 0);
});
