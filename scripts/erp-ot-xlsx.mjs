import path from 'node:path';
import {
  normalizeRows,
  parseExcelDate,
  parseNumber,
  printSummary,
  readWorkbookRows,
  toDisplayString,
  writeJsonOutput,
} from './lib/erp-excel-utils.mjs';

const fileName = 'BBDD_OT.xlsx';
const filePath = path.join(process.cwd(), 'datosERP', fileName);

const OT_MAPPING = {
  OT: ['OT', 'ot', 'orden', 'nro', 'numero', 'op', 'id', 'nro. orden', 'ot numero'],
  razonSocial: ['Razon Social', 'razon social', 'cliente'],
  descripcion: ['descripcion', 'descripción', 'producto', 'trabajo', 'glosa'],
  mllPedido: ['MLL Pedido', 'mll pedido', 'mll'],
  cantidadPedida: ['CANT PED', 'cantidad', 'cant pedida', 'qty'],
  fechaEntrega: ['FECHA ENT', 'fecha entrega', 'entrega'],
  material: ['Material', 'material'],
  medida: ['Medida', 'medida'],
  merma: ['merma', 'Merma'],
  impresion: ['impresion', 'impresión'],
  nroFicha: ['Nro. Ficha', 'nro ficha'],
};

const invalidOtTokens = new Set(['OT', 'ORDEN', 'NRO', 'NUMERO', 'ID', 'OP', 'TOTAL', 'SUBTOTAL', 'RESUMEN']);

const { sheetName, rows } = readWorkbookRows(filePath);
const mappedRows = normalizeRows(rows, OT_MAPPING);

const discarded = [];

const normalized = mappedRows
  .map((row, index) => ({
    sourceRow: index + 2,
    ot: toDisplayString(row.OT).toUpperCase(),
    cliente: toDisplayString(row.razonSocial),
    descripcion: toDisplayString(row.descripcion),
    cantidadPedida: row.mllPedido !== undefined && row.mllPedido !== null && row.mllPedido !== ''
      ? (parseNumber(row.mllPedido) ?? 0)
      : (parseNumber(row.cantidadPedida) ?? 0),
    mllPedido: parseNumber(row.mllPedido) ?? 0,
    fechaEntrega: parseExcelDate(row.fechaEntrega),
    material: toDisplayString(row.material),
    medida: toDisplayString(row.medida),
    merma: parseNumber(row.merma) ?? 0,
    impresion: toDisplayString(row.impresion),
    nroFicha: toDisplayString(row.nroFicha),
  }))
  .filter((row) => {
    const isSummary = [row.ot, row.cliente, row.descripcion, row.material]
      .map((value) => String(value || '').toUpperCase())
      .join(' ')
      .match(/OT DEL MES|RESUMEN|SUBTOTAL|TOTAL GENERAL/);
    const isJunk = ![row.ot, row.cliente, row.descripcion, row.material, row.cantidadPedida]
      .some((value) => typeof value === 'number' ? value !== 0 : String(value || '').trim());
    const isImportable = row.ot && !invalidOtTokens.has(row.ot) && !row.ot.startsWith('TOTAL') && !isSummary && !isJunk;
    if (!isImportable) {
      discarded.push(row);
    }
    return isImportable;
  });

const deduped = new Map();
for (const row of normalized) {
  deduped.set(row.ot, row);
}

const outputPath = writeJsonOutput('erp-ots.normalized.json', {
  fileName,
  sheetName,
  totalRows: rows.length,
  normalizedRows: normalized.length,
  uniqueRows: deduped.size,
  conflicts: 0,
  discarded: discarded.length,
  rows: Array.from(deduped.values()),
});

printSummary({
  fileName,
  sheetName,
  totalRows: rows.length,
  normalizedRows: normalized.length,
  uniqueRows: deduped.size,
  conflicts: 0,
  outputPath,
});
