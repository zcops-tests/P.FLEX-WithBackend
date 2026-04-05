import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BehaviorSubject } from 'rxjs';
import { OrdersService } from '../../src/features/orders/services/orders.service';

function createOrdersService(overrides: Record<string, unknown> = {}) {
  const service = Object.create(OrdersService.prototype) as OrdersService & Record<string, any>;

  Object.assign(service, {
    backend: {
      bulkUpsertWorkOrders: async () => ({ created: 0, updated: 0, total: 0 }),
    },
    state: {},
    storage: {
      removeItem() {},
    },
    zone: {
      run(callback: () => void) {
        callback();
      },
    },
    _ots: new BehaviorSubject<any[]>([]),
    _internalDatabase: new BehaviorSubject<any[]>([{ OT: 'OT-LEGACY' }]),
    _dbLastUpdated: new BehaviorSubject<Date | null>(null),
    ...overrides,
  });

  return service;
}

function buildRow(index: number) {
  return {
    OT: ` ot-${index} `,
    descripcion: ` Trabajo ${index} `,
    'Razon Social': ` Cliente ${index} `,
    maquina: ` IMP-${index} `,
    Estado_pedido: index % 2 === 0 ? 'EN PROCESO' : 'PENDIENTE',
    'CANT PED': `${index}`,
    total_mtl: `${index * 10}`,
    total_M2: `${index * 2}`,
    'FECHA ENT': '01/04/2026',
  };
}

test('importWorkOrders normalizes rows before sending them to bulkUpsert', async () => {
  const calls: any[] = [];
  const service = createOrdersService({
    backend: {
      async bulkUpsertWorkOrders(payload: any) {
        calls.push(payload);
        return { created: payload.items.length, updated: 0, total: payload.items.length };
      },
    },
  });

  const result = await service.importWorkOrders([
    {
      OT: ' ot-1001 ',
      descripcion: ' Etiqueta demo ',
      'Razon Social': ' Cliente Demo ',
      maquina: ' IMP-01 ',
      Estado_pedido: 'PENDIENTE',
      'CANT PED': '1,250',
      total_mtl: '10 500',
      total_M2: '250.5',
      'FECHA ENT': '01/04/2026',
    },
  ]);

  assert.equal(result.total, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].items[0].ot_number, 'OT-1001');
  assert.equal(calls[0].items[0].descripcion, 'Etiqueta demo');
  assert.equal(calls[0].items[0].cliente_razon_social, 'Cliente Demo');
  assert.equal(calls[0].items[0].maquina_texto, 'IMP-01');
  assert.equal(calls[0].items[0].fecha_entrega, '2026-04-01');
  assert.equal(calls[0].items[0].cantidad_pedida, 1.25);
  assert.equal(calls[0].items[0].total_metros, 10500);
  assert.equal(calls[0].items[0].total_m2, 250.5);
  assert.equal(calls[0].items[0].raw_payload.OT, 'OT-1001');
});

test('importWorkOrders discards rows without a valid OT and preserves active management OTs in the result', async () => {
  const service = createOrdersService({
    _ots: new BehaviorSubject<any[]>([{ OT: 'OT-2' }]),
    backend: {
      async bulkUpsertWorkOrders(payload: any) {
        return { created: 1, updated: 0, total: payload.items.length };
      },
    },
  });

  const result = await service.importWorkOrders([
    { OT: '', descripcion: 'Sin OT' },
    { OT: 'ot-2', descripcion: 'Activa en gestion' },
  ]);

  assert.equal(result.total, 1);
  assert.deepEqual(result.preservedManagementOtNumbers, ['OT-2']);
});

test('importWorkOrders batches requests in groups of 200 and emits progress per batch', async () => {
  const calls: number[] = [];
  const progressEvents: any[] = [];
  const service = createOrdersService({
    backend: {
      async bulkUpsertWorkOrders(payload: any) {
        calls.push(payload.items.length);
        return { created: 0, updated: payload.items.length, total: payload.items.length };
      },
    },
  });

  const rows = Array.from({ length: 401 }, (_, index) => buildRow(index + 1));
  const result = await service.importWorkOrders(rows, (progress) => {
    progressEvents.push(progress);
  });

  assert.deepEqual(calls, [200, 200, 1]);
  assert.equal(result.updated, 401);
  assert.equal(progressEvents.length, 4);
  assert.deepEqual(progressEvents[0], {
    currentBatch: 0,
    totalBatches: 3,
    processedItems: 0,
    totalItems: 401,
    percentage: 0,
  });
  assert.equal(progressEvents[3].currentBatch, 3);
  assert.equal(progressEvents[3].processedItems, 401);
  assert.equal(progressEvents[3].percentage, 100);
});

test('importWorkOrders invalidates the internal snapshot only after a successful import', async () => {
  const service = createOrdersService({
    backend: {
      async bulkUpsertWorkOrders(payload: any) {
        return { created: payload.items.length, updated: 0, total: payload.items.length };
      },
    },
  });

  const before = service._dbLastUpdated.value;
  await service.importWorkOrders([buildRow(1)]);

  assert.deepEqual(service._internalDatabase.value, []);
  assert.ok(service._dbLastUpdated.value instanceof Date);
  assert.notEqual(service._dbLastUpdated.value, before);
});

test('importWorkOrders propagates backend failures without pretending later batches succeeded', async () => {
  const calls: number[] = [];
  const progressEvents: any[] = [];
  const service = createOrdersService({
    backend: {
      async bulkUpsertWorkOrders(payload: any) {
        calls.push(payload.items.length);
        if (calls.length === 2) {
          throw new Error('bulk-upsert failed');
        }
        return { created: payload.items.length, updated: 0, total: payload.items.length };
      },
    },
  });

  const rows = Array.from({ length: 250 }, (_, index) => buildRow(index + 1));

  await assert.rejects(
    service.importWorkOrders(rows, (progress) => {
      progressEvents.push(progress);
    }),
    /bulk-upsert failed/,
  );

  assert.deepEqual(calls, [200, 50]);
  assert.equal(progressEvents.length, 2);
  assert.equal(progressEvents[1].processedItems, 200);
  assert.deepEqual(service._internalDatabase.value, [{ OT: 'OT-LEGACY' }]);
  assert.equal(service._dbLastUpdated.value, null);
});
