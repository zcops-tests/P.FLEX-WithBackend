import assert from 'node:assert/strict';
import test from 'node:test';
import { InventoryImportFlowService } from '../../src/features/inventory/services/inventory-import-flow.service';

function createService(overrides: Record<string, unknown> = {}) {
  const service = Object.create(InventoryImportFlowService.prototype) as InventoryImportFlowService & Record<string, any>;
  Object.assign(service, {
    fileExport: {
      preloadXlsx: async () => undefined,
      readWorkbook: async () => ({
        SheetNames: ['Hoja1'],
        Sheets: { Hoja1: { id: 'sheet-1' } },
      }),
      sheetToJson: async () => [],
    },
    ...overrides,
  });

  return service;
}

test('inventory import flow reads first sheet and reports progressive analysis states', async () => {
  const progress: Array<Record<string, any>> = [];
  const service = createService({
    fileExport: {
      preloadXlsx: async () => undefined,
      readWorkbook: async () => ({
        SheetNames: ['Datos'],
        Sheets: { Datos: { id: 'datos' } },
      }),
      sheetToJson: async () => [{ code: 'A1' }, { code: 'B2' }],
    },
  });

  const file = {
    name: 'inventario.xlsx',
    arrayBuffer: async () => new ArrayBuffer(8),
  } as File;

  const result = await service.analyzeFile({
    entityLabel: 'clisés',
    file,
    normalize: (rows: any[]) => ({
      valid: rows.slice(0, 1),
      conflicts: rows.slice(1),
      discarded: [],
    }),
    onProgress: (entry) => progress.push(entry),
  });

  assert.equal(result.totalItems, 2);
  assert.equal(result.valid.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.discarded.length, 0);
  assert.match(progress[0]?.phase || '', /Preparando archivo/i);
  assert.ok(progress.some((entry) => /Leyendo archivo/i.test(String(entry.phase))));
  assert.ok(progress.some((entry) => /Extrayendo registros/i.test(String(entry.phase))));
  assert.match(progress.at(-1)?.phase || '', /Análisis completado/i);
  assert.equal(progress.at(-1)?.percentage, 100);
});

test('inventory import flow fails when workbook has no sheets', async () => {
  const service = createService({
    fileExport: {
      preloadXlsx: async () => undefined,
      readWorkbook: async () => ({ SheetNames: [], Sheets: {} }),
      sheetToJson: async () => [],
    },
  });

  const file = {
    name: 'vacio.xlsx',
    arrayBuffer: async () => new ArrayBuffer(8),
  } as File;

  await assert.rejects(
    service.analyzeFile({
      entityLabel: 'stock',
      file,
      normalize: () => ({ valid: [], conflicts: [], discarded: [] }),
    }),
    /no contiene hojas/i,
  );
});

test('inventory import flow fails when first sheet has no rows', async () => {
  const service = createService();
  const file = {
    name: 'sin-filas.xlsx',
    arrayBuffer: async () => new ArrayBuffer(8),
  } as File;

  await assert.rejects(
    service.analyzeFile({
      entityLabel: 'troqueles',
      file,
      normalize: () => ({ valid: [], conflicts: [], discarded: [] }),
    }),
    /No se encontraron datos en la hoja/i,
  );
});
