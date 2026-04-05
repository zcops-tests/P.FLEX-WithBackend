import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { OtImportComponent } from '../../src/features/orders/components/ot-import.component';

const COLUMN_MAPPINGS = {
  OT: ['ot', 'orden', 'nro', 'numero', 'op', 'id', 'nro. orden', 'ot numero', 'n°', 'número'],
  'Razon Social': ['cliente', 'client', 'empresa', 'razon social', 'customer', 'nombre cliente', 'r. social', 'razón social'],
  descripcion: ['descripcion', 'descripción', 'producto', 'trabajo', 'item', 'nombre', 'detalle', 'desc', 'artículo'],
  'MLL Pedido': ['mll pedido', 'mllpedido', 'mll', 'millares pedido', 'millares'],
  'CANT PED': ['cantidad', 'cant', 'qty', 'cantidad pedida', 'cant.', 'cant pedida', 'total', 'unidades', 'cant.'],
  'FECHA ENT': ['fecha', 'entrega', 'fecha entrega', 'date', 'delivery', 'f. entrega', 'f.entrega', 'fecha ent'],
  maquina: ['maquina', 'máquina', 'machine', 'linea', 'equipo', 'maq', 'maquina asignada'],
  Estado_pedido: ['estado', 'status', 'situacion', 'state', 'est', 'estatus'],
  'FECHA INGRESO PLANTA': ['ingreso', 'fecha ingreso', 'ingreso planta', 'f. ingreso'],
};

function createComponent(overrides: Record<string, unknown> = {}) {
  const component = Object.create(OtImportComponent.prototype) as OtImportComponent & Record<string, any>;

  Object.assign(component, {
    cdr: {
      detectChanges() {},
      markForCheck() {},
    },
    fileExport: {
      preloadXlsx: async () => undefined,
      getXlsx: () => ({ read() {} }),
      readWorkbook: async () => ({
        SheetNames: ['OTs'],
        Sheets: { OTs: {} },
      }),
      sheetToJson: async () => [],
    },
    close: { emit() {} },
    dataImported: { emit() {} },
    step: 'upload',
    isDragging: false,
    isLoading: false,
    isImporting: false,
    importedData: [],
    analysisSummary: {
      valid: 0,
      conflicts: 0,
      discarded: 0,
    },
    analysisProgress: {
      phase: 'Esperando archivo',
      percentage: 0,
      processedItems: 0,
      totalItems: 0,
      detail: 'Normalizando y eliminando duplicados',
    },
    columnMappings: COLUMN_MAPPINGS,
    yieldToUi: async () => undefined,
    ...overrides,
  });

  return component;
}

function createFile(name = 'ots.xlsx') {
  return {
    name,
    async arrayBuffer() {
      return new ArrayBuffer(8);
    },
  } as File;
}

test('processFile reads the first sheet and advances to preview without truncating stored data', async () => {
  const rows = Array.from({ length: 105 }, (_, index) => ({
    OT: `ot-${index + 1}`,
    Cliente: `Cliente ${index + 1}`,
    descripcion: `Trabajo ${index + 1}`,
    maquina: `IMP-${index + 1}`,
    'CANT PED': `${index + 1}`,
  }));

  const component = createComponent({
    fileExport: {
      preloadXlsx: async () => undefined,
      getXlsx: () => ({ read() {} }),
      readWorkbook: async () => ({
        SheetNames: ['Import'],
        Sheets: { Import: {} },
      }),
      sheetToJson: async () => rows,
    },
  });

  await component.processFile(createFile());

  assert.equal(component.step, 'preview');
  assert.equal(component.importedData.length, 105);
  assert.equal(component.analysisProgress.percentage, 100);
  assert.equal(component.analysisSummary.valid, 105);
  assert.equal(component.analysisSummary.discarded, 0);
  assert.equal(component.importedData[104].OT, 'OT-105');
});

test('processFile resets the component when the workbook has no sheets', async () => {
  const alerts: string[] = [];
  const previousAlert = globalThis.alert;
  globalThis.alert = ((message: string) => {
    alerts.push(message);
  }) as typeof alert;

  try {
    const component = createComponent({
      fileExport: {
        preloadXlsx: async () => undefined,
        getXlsx: () => ({ read() {} }),
        readWorkbook: async () => ({
          SheetNames: [],
          Sheets: {},
        }),
        sheetToJson: async () => [],
      },
    });

  await component.processFile(createFile('empty.xlsx'));

  assert.equal(component.step, 'upload');
  assert.equal(component.importedData.length, 0);
  assert.equal(component.analysisSummary.valid, 0);
  assert.equal(component.isLoading, false);
    assert.match(alerts[0] || '', /no contiene hojas/i);
  } finally {
    globalThis.alert = previousAlert;
  }
});

test('processFile resets the component when the selected sheet has no rows', async () => {
  const alerts: string[] = [];
  const previousAlert = globalThis.alert;
  globalThis.alert = ((message: string) => {
    alerts.push(message);
  }) as typeof alert;

  try {
    const component = createComponent({
      fileExport: {
        preloadXlsx: async () => undefined,
        getXlsx: () => ({ read() {} }),
        readWorkbook: async () => ({
          SheetNames: ['OTs'],
          Sheets: { OTs: {} },
        }),
        sheetToJson: async () => [],
      },
    });

    await component.processFile(createFile('no-rows.xlsx'));

    assert.equal(component.step, 'upload');
    assert.equal(component.importedData.length, 0);
    assert.match(alerts[0] || '', /no se encontraron datos/i);
  } finally {
    globalThis.alert = previousAlert;
  }
});

test('normalizeData maps equivalent headers, cleans values and keeps the last duplicate OT', async () => {
  const component = createComponent();

  const normalized = await component.normalizeData([
    {
      Número: ' ot-1001 ',
      'Razón Social': ' Cliente Uno ',
      Descripción: ' Etiqueta inicial ',
      'MLL Pedido': '3,750',
      'Cantidad pedida': '1,250',
      Máquina: ' IMP-01 ',
      Estado: 'Pendiente',
    },
    {
      OT: 'OT-1001',
      Cliente: 'Cliente Uno Actualizado',
      descripcion: 'Etiqueta final',
      'CANT PED': '2 500',
      maquina: ' IMP-02 ',
      Estado_pedido: 'EN PROCESO',
      total_mtl: '10,500',
      merma: '25',
    },
    {
      OT: 'TOTAL',
      Cliente: 'Resumen',
    },
  ]);

  assert.equal(normalized.valid.length, 1);
  assert.equal(normalized.conflicts.length, 0);
  assert.equal(normalized.discarded.length, 1);
  assert.equal(normalized.valid[0].OT, 'OT-1001');
  assert.equal(normalized.valid[0]['Razon Social'], 'Cliente Uno Actualizado');
  assert.equal(normalized.valid[0].descripcion, 'Etiqueta final');
  assert.equal(normalized.valid[0].maquina, 'IMP-02');
  assert.equal(normalized.valid[0]['MLL Pedido'], 3750);
  assert.equal(normalized.valid[0]['CANT PED'], 3750);
  assert.equal(normalized.valid[0].total_mtl, 10500);
  assert.equal(normalized.valid[0].merma, 25);
});

test('normalizeData discards invalid and summary rows and can end with zero valid records', async () => {
  const component = createComponent();

  const normalized = await component.normalizeData([
    { OT: '' },
    { OT: 'OT DEL MES', Cliente: 'Resumen mensual' },
    { OT: 'TOTAL', Cliente: 'Resumen' },
    { OT: '326', Cliente: 'OT DEL MES', descripcion: 'OT DEL MES', Material: 'OT DEL MES' },
  ]);

  assert.deepEqual(normalized.valid, []);
  assert.equal(normalized.discarded.length, 4);
});

test('isValidNormalizedRow handles boundary values explicitly', () => {
  const component = createComponent();

  assert.equal(component.isValidNormalizedRow({ OT: 'OT-2001', 'Razon Social': 'Cliente' }), true);
  assert.equal(component.isValidNormalizedRow({ OT: '' }), false);
  assert.equal(component.isValidNormalizedRow({ OT: 'OT' }), false);
  assert.equal(component.isValidNormalizedRow({ OT: 'TOTAL GENERAL' }), false);
  assert.equal(
    component.isValidNormalizedRow({ OT: 'OT-DEL-MES', 'Razon Social': 'OT DEL MES' }),
    false,
  );
});

test('onDrop triggers processing with the dropped file and clears drag state', () => {
  let receivedFile: File | null = null;
  const component = createComponent({
    processFile(file: File) {
      receivedFile = file;
    },
    isDragging: true,
  });
  const file = createFile('drop.xlsx');

  component.onDrop({
    preventDefault() {},
    dataTransfer: { files: [file] },
  } as unknown as DragEvent);

  assert.equal(component.isDragging, false);
  assert.equal(receivedFile, file);
});

test('onFileSelected triggers processing and clears the input value', () => {
  let receivedFile: File | null = null;
  const component = createComponent({
    processFile(file: File) {
      receivedFile = file;
    },
  });
  const file = createFile('select.xlsx');
  const event = {
    target: {
      files: [file],
      value: 'c:/fake/select.xlsx',
    },
  };

  component.onFileSelected(event);

  assert.equal(receivedFile, file);
  assert.equal(event.target.value, '');
});
