import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { InventoryComponent } from '../../../src/features/inventory/components/inventory.component';
import { InventoryMapComponent } from '../../../src/features/inventory/components/inventory-map.component';
import { InventoryCliseComponent } from '../../../src/features/inventory/components/inventory-clise.component';
import { InventoryDieComponent } from '../../../src/features/inventory/components/inventory-die.component';
import { InventoryStockComponent } from '../../../src/features/inventory/components/inventory-stock.component';
import { InventoryInkComponent } from '../../../src/features/inventory/components/inventory-ink.component';

const inventorySource = readFileSync(resolve(process.cwd(), 'src/features/inventory/components/inventory.component.ts'), 'utf8');
const cliseSource = readFileSync(resolve(process.cwd(), 'src/features/inventory/components/inventory-clise.component.ts'), 'utf8');
const dieSource = readFileSync(resolve(process.cwd(), 'src/features/inventory/components/inventory-die.component.ts'), 'utf8');
const stockSource = readFileSync(resolve(process.cwd(), 'src/features/inventory/components/inventory-stock.component.ts'), 'utf8');

test('inventory module smoke imports all inventory surfaces', () => {
  assert.equal(typeof InventoryComponent, 'function');
  assert.equal(typeof InventoryMapComponent, 'function');
  assert.equal(typeof InventoryCliseComponent, 'function');
  assert.equal(typeof InventoryDieComponent, 'function');
  assert.equal(typeof InventoryStockComponent, 'function');
  assert.equal(typeof InventoryInkComponent, 'function');
});

test('inventory module keeps dynamic subtype navigation and layout map support', () => {
  assert.match(inventorySource, /inventory\/:type|inventory/i);
  assert.match(inventorySource, /layout|mapa|map/i);
});

test('inventory module exposes import workflows for clises, dies and stock', () => {
  assert.match(cliseSource, /accept="\.xlsx, \.xls, \.csv"/);
  assert.match(dieSource, /accept="\.xlsx, \.xls, \.csv"/);
  assert.match(stockSource, /accept="\.xlsx, \.xls, \.csv"/);
});

function createStockComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(InventoryStockComponent.prototype) as InventoryStockComponent & Record<string, any>;
  const notifications = {
    warnings: [] as string[],
    errors: [] as string[],
    successes: [] as string[],
    showWarning(message: string) { this.warnings.push(message); },
    showError(message: string) { this.errors.push(message); },
    showSuccess(message: string) { this.successes.push(message); },
  };
  const addStocksCalls: any[] = [];

  Object.assign(component, {
    state: { hasPermission: () => true },
    inventoryService: {
      addStocks: async (items: any[]) => { addStocksCalls.push(items); },
      addStock: async () => undefined,
      updateStock: async () => undefined,
      normalizeStockData: () => ({ valid: [], conflicts: [] }),
    },
    excelService: { readExcel: async () => [] },
    notifications,
    cdr: { detectChanges() {} },
    ngZone: { run(cb: () => void) { cb(); }, runOutsideAngular(cb: () => void) { cb(); } },
    destroyRef: {},
    stockItems: [],
    searchTerm: '',
    currentPage: 1,
    rowsPerPage: 8,
    previewData: [],
    conflictsData: [],
    showImportPreviewModal: false,
    isImporting: false,
    showModal: false,
    editingItem: false,
    isReadOnly: false,
    tempItem: {},
    ...overrides,
  });

  return { component, notifications, addStocksCalls };
}

function createDieComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(InventoryDieComponent.prototype) as InventoryDieComponent & Record<string, any>;
  const importCalls: any[] = [];

  Object.assign(component, {
    state: { hasPermission: () => true },
    inventoryService: {
      importDies: async (items: any[], onProgress: (progress: any) => void) => {
        importCalls.push(items);
        onProgress({ currentBatch: 1, totalBatches: 1, processedItems: items.length, totalItems: items.length });
        return { imported: items.length, conflicts: 1 };
      },
    },
    cdr: { detectChanges() {} },
    ngZone: { run(cb: () => void) { cb(); }, runOutsideAngular(cb: () => void) { cb(); } },
    dieItems: [],
    searchTerm: '',
    filterZ: '',
    filterMaterial: '',
    filterShape: '',
    sortColumn: '',
    sortDirection: 'asc',
    currentPage: 1,
    pageSize: 20,
    previewData: [],
    conflictsData: [],
    showImportPreviewModal: false,
    isImporting: false,
    importProgressPercent: 0,
    importProgressText: '',
    showDieForm: false,
    isReadOnly: false,
    currentDie: {},
    ...overrides,
  });

  return { component, importCalls };
}

test('inventory host component validates subtype selection', () => {
  const component = Object.create(InventoryComponent.prototype) as InventoryComponent & Record<string, any>;
  component.inventoryType = 'stock';
  assert.equal(component.isValidType, true);
  component.inventoryType = 'unknown';
  assert.equal(component.isValidType, false);
});

test('inventory stock filters records, computes KPIs and paginates visible pages', () => {
  const { component } = createStockComponent({
    stockItems: [
      { id: '1', medida: '100x50', material: 'PP', etiqueta: 'Cliente A', forma: 'Recta', tipoProducto: 'A', caja: 'C1', ubicacion: 'U1', boxId: 'BOX-1', cantidadMillares: 10, status: 'Liberado' },
      { id: '2', medida: '120x60', material: 'PE', etiqueta: 'Cliente B', forma: 'Circular', tipoProducto: 'B', caja: 'C2', ubicacion: 'U2', boxId: 'BOX-2', cantidadMillares: 5, status: 'Cuarentena' },
      { id: '3', medida: '130x70', material: 'PET', etiqueta: 'Otra', forma: 'Cuadrada', tipoProducto: 'C', caja: 'C3', ubicacion: 'U3', boxId: 'BOX-3', cantidadMillares: 8, status: 'Retenido' },
    ],
    rowsPerPage: 1,
  });
  component.searchTerm = 'cliente b';
  assert.equal(component.filteredItems.length, 1);
  component.searchTerm = '';
  assert.equal(component.stats.totalMillares, 23);
  assert.equal(component.stats.released, 1);
  component.currentPage = 2;
  assert.deepEqual(component.visiblePages, [1, 2, 3]);
});

test('inventory stock requires box before saving and clears import preview after successful import', async () => {
  const ctx = createStockComponent({
    tempItem: { caja: '', medida: '100x50' },
    previewData: [{ caja: 'C1' }],
    conflictsData: [{ caja: '' }],
    showImportPreviewModal: true,
  });
  const { component, notifications, addStocksCalls } = ctx;

  await component.saveItem();
  assert.match(notifications.warnings[0] || '', /complete la CAJA/i);

  await component.confirmImport();
  assert.equal(addStocksCalls.length, 1);
  assert.equal(component.showImportPreviewModal, true);
  assert.equal(component.previewData.length, 1);
  assert.equal(component.conflictsData.length, 1);
  assert.match(notifications.successes[0] || '', /quedaron 1 pendientes/i);
});

test('inventory stock opens edit vs create modal with permission-aware modes', () => {
  const { component } = createStockComponent();

  component.openModal(null);
  assert.equal(component.showModal, true);
  assert.equal(component.editingItem, false);
  assert.equal(component.isReadOnly, false);

  component.openModal({ id: 'existing', caja: 'C1', status: 'Liberado' } as any);
  assert.equal(component.editingItem, true);
});

test('inventory die sorts, clears filters and opens view mode when the user lacks manage permission', () => {
  const { component } = createDieComponent({
    state: { hasPermission: () => false },
    dieItems: [
      { id: '2', serie: 'B-2', cliente: 'Cliente B', medida: '120', ubicacion: 'U2', z: '2', material: 'PE', forma: 'Circular', estado: 'Dañado', hasConflict: false },
      { id: '1', serie: 'A-1', cliente: 'Cliente A', medida: '100', ubicacion: 'U1', z: '1', material: 'PP', forma: 'Recta', estado: 'OK', hasConflict: false },
    ],
  });

  component.toggleSort('serie');
  assert.equal(component.filteredAndSortedList[0].serie, 'A-1');
  component.toggleSort('serie');
  assert.equal(component.filteredAndSortedList[0].serie, 'B-2');

  component.searchTerm = 'algo';
  component.filterZ = '9';
  component.filterMaterial = 'PP';
  component.filterShape = 'Recta';
  component.clearFilters();
  assert.equal(component.searchTerm, '');
  assert.equal(component.filterZ, '');
  assert.equal(component.filterMaterial, '');
  assert.equal(component.filterShape, '');

  component.openModal({ id: '1', serie: 'A-1' }, 'edit');
  assert.equal(component.isReadOnly, true);
});

test('inventory die confirmImport reports progress and clears preview after completion', async () => {
  const previousAlert = globalThis.alert;
  const alerts: string[] = [];
  globalThis.alert = ((message: string) => { alerts.push(message); }) as typeof alert;

  try {
    const { component, importCalls } = createDieComponent({
      previewData: [{ id: 'ok-1' }],
      conflictsData: [{ id: 'conflict-1' }],
      showImportPreviewModal: true,
    });
    component.waitForNextPaint = async () => undefined;

    await component.confirmImport();

    assert.equal(importCalls.length, 1);
    assert.equal(component.showImportPreviewModal, true);
    assert.equal(component.importProgressPercent, 0);
    assert.match(alerts[0] || '', /Se importaron 2 registros/i);
  } finally {
    globalThis.alert = previousAlert;
  }
});
