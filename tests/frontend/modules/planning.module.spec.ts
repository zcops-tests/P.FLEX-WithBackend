import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ScheduleComponent } from '../../../src/features/planning/schedule.component';

const source = readFileSync(resolve(process.cwd(), 'src/features/planning/schedule.component.ts'), 'utf8');

function createComponent() {
  const component = Object.create(ScheduleComponent.prototype) as ScheduleComponent & Record<string, any>;
  component.state = { adminMachines: () => [] };
  component.ordersService = { ots: [] };
  component.qualityService = { activeIncidents: [] };
  component.fileExport = {};
  component.notifications = {};
  component.adminService = {};
  component.backend = {};
  component.zone = { run(cb: () => void) { cb(); } };
  component.changeDetectorRef = { markForCheck() {} };
  component.selectedShift = 'DIA';
  component.selectedArea = 'IMPRESION';
  component.selectedDate = component['getCurrentLocalDate']();
  component._jobs = [];
  component.showValidationModal = false;
  component.validationStep = 1;
  component.tempStartDateTime = '';
  component.tempDurationHours = 0;
  component.showNowLine = true;
  return component;
}

test('planning module smoke imports schedule component', () => {
  assert.equal(typeof ScheduleComponent, 'function');
});

test('planning module computes time slots and hour offsets for day shift scheduling', () => {
  const component = createComponent();
  assert.equal(component.timeSlots.length, 12);
  assert.equal(component.getHourOffset(7, 0), 0);
  assert.equal(component.getHourOffset(13, 30), 6.5);
  assert.equal(component.calculateWidth({ duration: 120 }), (2 / 12) * 100);
});

test('planning module source includes schedule validation and real-time now line logic', () => {
  assert.match(source, /validationStep/);
  assert.match(source, /updateNowLine/);
  assert.match(source, /refreshScheduleFromBackend/);
});

test('planning module deduplicates OT suggestions across management and internal database', () => {
  const component = createComponent();
  component.currentJob = { ot: 'cliente' };
  component.ordersService = {
    ots: [
      { OT: 'OT-1', 'Razon Social': 'Cliente Uno', descripcion: 'Trabajo 1' },
      { OT: 'OT-2', 'Razon Social': 'Cliente Dos', descripcion: 'Trabajo 2' },
    ],
    internalDatabase: [
      { OT: 'OT-1', 'Razon Social': 'Cliente Uno', descripcion: 'Duplicado' },
      { OT: 'OT-3', 'Razon Social': 'Cliente Tres', descripcion: 'Trabajo 3' },
    ],
  };

  const suggestions = component.workOrderSuggestions;
  assert.deepEqual(suggestions.map((item: any) => item.OT), ['OT-1', 'OT-2', 'OT-3']);
});

test('planning module detects overlapping schedule conflicts for the selected machine and window', () => {
  const component = createComponent();
  component.currentJob = { machineId: 'machine-1', id: 'draft' };
  component.tempStartDateTime = `${component.selectedDate}T08:30`;
  component.tempDurationHours = 1;
  component._jobs = [
    {
      id: 'job-1',
      machineId: 'machine-1',
      ot: 'OT-123',
      start: '08:00',
      duration: 90,
      scheduledDate: component.selectedDate,
    },
  ];

  assert.equal(component.currentScheduleConflict?.id, 'job-1');
  assert.match(component.scheduleAvailabilityDescription, /OT #OT-123/i);
});

test('planning module seeds the add modal with defaults from the current context', () => {
  const component = createComponent();
  Object.defineProperty(component, 'filteredMachines', {
    value: [{ id: 'machine-1' }],
    configurable: true,
  });
  component.state = {
    adminMachines: () => [{ id: 'machine-1' }],
    userName: () => 'Planner Host',
    adminUsers: () => [],
  };

  component.openAddModal();

  assert.equal(component.showJobModal, true);
  assert.equal(component.currentJob.machineId, 'machine-1');
  assert.equal(component.currentJob.shift, component.selectedShift);
  assert.equal(component.currentJob.area, component.selectedArea);
});

test('planning module reverts machine status changes when backend update fails', async () => {
  const component = createComponent();
  const updates: any[] = [];
  component.state = {
    adminMachines: () => [],
    updateMachine(machine: any) {
      updates.push(machine);
    },
  };
  component.adminService = {
    async updateMachine() {
      throw new Error('backend unavailable');
    },
  };
  const errors: string[] = [];
  component.notifications = {
    showError(message: string) {
      errors.push(message);
    },
  };

  await component.updateMachineStatus({ id: 'm1', status: 'Activo' }, 'Detenida');

  assert.equal(updates.length, 2);
  assert.equal(updates[0].status, 'Detenida');
  assert.equal(updates[1].status, 'Activo');
  assert.match(errors[0] || '', /backend unavailable/i);
});

test('planning module validates required fields before saving and warns on schedule conflicts', async () => {
  const component = createComponent();
  const warnings: string[] = [];
  component.notifications = {
    showWarning(message: string) {
      warnings.push(message);
    },
    showSuccess() {},
    showError() {},
  };
  component.currentJob = { ot: '', machineId: '', id: 'draft' };
  component.tempStartDateTime = '';
  component.tempDurationHours = 0;

  await component.saveJob();
  assert.match(warnings[0] || '', /ingrese una OT/i);

  component.currentJob = { ot: 'OT-1', machineId: 'machine-1', id: 'draft' };
  component.tempStartDateTime = `${component.selectedDate}T08:30`;
  component.tempDurationHours = 1;
  component._jobs = [
    { id: 'existing', machineId: 'machine-1', ot: 'OT-9', start: '08:00', duration: 90, scheduledDate: component.selectedDate },
  ];

  await component.saveJob();
  assert.match(warnings[1] || '', /ya tiene la OT OT-9/i);
});

test('planning module saves a valid schedule and sends today work orders to management', async () => {
  const component = createComponent();
  const successMessages: string[] = [];
  const createCalls: any[] = [];
  const managementEntries: any[] = [];

  component.notifications = {
    showWarning() {},
    showError(message: string) {
      throw new Error(message);
    },
    showSuccess(message: string) {
      successMessages.push(message);
    },
  };
  Object.defineProperty(component, 'filteredMachines', {
    value: [{ id: 'machine-1' }],
    configurable: true,
  });
  component.state = {
    adminMachines: () => [{ id: 'machine-1', name: 'IMP-01' }],
    adminUsers: () => [],
    userName: () => 'Planner Host',
  };
  component.ordersService = {
    ots: [],
    internalDatabase: [],
    async findWorkOrderByOtNumber() {
      return { id: 'wo-100', OT: 'OT-100' };
    },
    async enterManagementWorkOrders(items: any[]) {
      managementEntries.push(items);
    },
  };
  component.backend = {
    async createPlanningSchedule(payload: any) {
      createCalls.push(payload);
      return { id: 'schedule-1' };
    },
    async getPlanningSchedules() {
      return [];
    },
  };
  component.currentJob = {
    ot: 'OT-100',
    machineId: 'machine-1',
    operator: 'Operario Plan',
    description: 'Notas',
  };
  component.tempStartDateTime = `${component.selectedDate}T09:15`;
  component.tempDurationHours = 2;

  await component.saveJob();

  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].work_order_id, 'wo-100');
  assert.equal(createCalls[0].machine_id, 'machine-1');
  assert.equal(createCalls[0].duration_minutes, 120);
  assert.equal(createCalls[0].start_time, '09:15');
  assert.equal(managementEntries.length, 1);
  assert.equal(component.showJobModal, false);
  assert.match(successMessages[0] || '', /programada correctamente/i);
});
