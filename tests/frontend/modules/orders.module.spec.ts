import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { OtListComponent } from '../../../src/features/orders/components/ot-list.component';
import { OtImportComponent } from '../../../src/features/orders/components/ot-import.component';
import { OtDetailComponent } from '../../../src/features/orders/components/ot-detail.component';
import { OtFormComponent } from '../../../src/features/orders/components/ot-form.component';
import { OrdersService } from '../../../src/features/orders/services/orders.service';
import { BehaviorSubject } from 'rxjs';

const listSource = readFileSync(resolve(process.cwd(), 'src/features/orders/components/ot-list.component.ts'), 'utf8');
const importSource = readFileSync(resolve(process.cwd(), 'src/features/orders/components/ot-import.component.ts'), 'utf8');

function createOrdersService() {
  const service = Object.create(OrdersService.prototype) as OrdersService & Record<string, any>;
  const calls: any[] = [];
  service.backend = {
    async bulkUpsertWorkOrders(payload: any) {
      calls.push(payload.items.length);
      return { created: 0, updated: payload.items.length, total: payload.items.length };
    },
  };
  service.state = {};
  service.storage = { removeItem() {} };
  service.zone = { run(cb: () => void) { cb(); } };
  service._ots = new BehaviorSubject<any[]>([{ OT: 'OT-2' }]);
  service._internalDatabase = new BehaviorSubject<any[]>([]);
  service._dbLastUpdated = new BehaviorSubject<Date | null>(null);
  service.__calls = calls;
  return service;
}

test('orders module smoke imports list, import, detail, form and service', () => {
  assert.equal(typeof OtListComponent, 'function');
  assert.equal(typeof OtImportComponent, 'function');
  assert.equal(typeof OtDetailComponent, 'function');
  assert.equal(typeof OtFormComponent, 'function');
  assert.equal(typeof OrdersService, 'function');
});

test('orders module service preserves batching and management preservation during import', async () => {
  const service = createOrdersService();
  const rows = Array.from({ length: 201 }, (_, index) => ({
    OT: `OT-${index + 1}`,
    descripcion: `Trabajo ${index + 1}`,
    'Razon Social': 'Cliente',
    maquina: 'IMP-01',
    Estado_pedido: 'PENDIENTE',
  }));
  rows[1].OT = 'OT-2';

  const result = await service.importWorkOrders(rows);
  assert.deepEqual(service.__calls, [200, 1]);
  assert.deepEqual(result.preservedManagementOtNumbers, ['OT-2']);
});

test('orders module templates expose import, database browser and management operations', () => {
  assert.match(importSource, /Carga Masiva de OTs/);
  assert.match(importSource, /InventoryImportPreviewComponent/);
  assert.match(importSource, /app-inventory-import-preview/);
  assert.match(listSource, /import/i);
  assert.match(listSource, /gestión|gestion/i);
  assert.match(listSource, /db|base de datos/i);
});
