import assert from 'node:assert/strict';
import test from 'node:test';
import { InventoryService } from '../../src/features/inventory/services/inventory.service';

function createService() {
  const service = Object.create(InventoryService.prototype) as InventoryService & Record<string, any>;
  service.excelService = {
    normalizeData: (rows: any[]) => rows,
    toDisplayString: (value: unknown) => String(value ?? '').trim(),
    parseNumber: (value: unknown) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    },
  };

  return service;
}

test('inventory normalization discards junk clise rows but keeps resolvable conflicts importable', () => {
  const service = createService();

  const result = service.normalizeCliseData([
    {
      item: '',
      cliente: '',
      descripcion: '',
      troquel: '',
      ancho: '',
      avance: '',
      medidas: 'X',
      maq: 'SP',
      ubicacion: '500',
    },
    {
      item: 'CL-001',
      cliente: '',
      descripcion: 'Etiqueta válida',
      troquel: 'TR-01',
      ancho: '60',
      avance: '54',
      medidas: '60x54',
      ubicacion: '120',
    },
    {
      item: 'CL-002',
      cliente: 'Cliente',
      descripcion: 'Etiqueta lista',
      troquel: 'TR-02',
      ancho: '80',
      avance: '60',
      medidas: '80x60',
      ubicacion: '121',
    },
  ]);

  assert.equal(result.discarded.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.valid.length, 1);
  assert.equal(result.conflicts[0].item, 'CL-001');
  assert.deepEqual(result.conflicts[0].conflictReasons, ['CLIENT_REQUIRED']);
});

test('inventory normalization discards junk die rows but keeps resolvable conflicts importable', () => {
  const service = createService();

  const result = service.normalizeDieData([
    {
      serie: '',
      cliente: '',
      medida: '',
      material: '',
      forma: '',
      ancho_mm: '',
      avance_mm: '',
      ubicacion: 'TUBO 2',
    },
    {
      serie: 'TG-001',
      cliente: '',
      medida: '100x50',
      material: 'TT',
      forma: 'REC',
      ancho_mm: '100',
      avance_mm: '50',
      ubicacion: 'A-01',
    },
    {
      serie: 'TG-002',
      cliente: 'Cliente',
      medida: '110x60',
      material: 'TT',
      forma: 'REC',
      ancho_mm: '110',
      avance_mm: '60',
      ubicacion: 'A-02',
    },
  ]);

  assert.equal(result.discarded.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.valid.length, 1);
  assert.equal(result.conflicts[0].serie, 'TG-001');
  assert.deepEqual(result.conflicts[0].conflictReasons, ['CLIENT_REQUIRED']);
});

test('inventory normalization keeps stock conflicts importable and discards only empty rows', () => {
  const service = createService();

  const result = service.normalizeStockData([
    {
      medida: '',
      anchoMm: '',
      avanceMm: '',
      material: '',
      columnas: '',
      prepicado: '',
      cantidadXRollo: '',
      cantidadMillares: '',
      etiqueta: '',
      forma: '',
      tipoProducto: '',
      caja: '',
      ubicacion: '',
    },
    {
      medida: '100x50',
      material: 'PP',
      etiqueta: 'Cliente',
      forma: 'RECTA',
      tipoProducto: 'A',
      caja: '',
      ubicacion: 'REC',
    },
    {
      medida: '120x60',
      material: 'PE',
      etiqueta: 'Cliente',
      forma: 'RECTA',
      tipoProducto: 'B',
      caja: 'C1',
      ubicacion: 'R1',
    },
  ]);

  assert.equal(result.discarded.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.valid.length, 1);
  assert.equal(result.conflicts[0].caja, '');
  assert.deepEqual(result.conflicts[0].conflictReasons, ['MISSING_CAJA']);
});
