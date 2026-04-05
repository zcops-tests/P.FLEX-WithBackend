import path from 'node:path';
import {
  normalizeRows,
  parseNumber,
  printSummary,
  readWorkbookRows,
  toDisplayString,
  writeJsonOutput,
} from './lib/erp-excel-utils.mjs';

const fileName = 'STOCK.xlsx';
const filePath = path.join(process.cwd(), 'datosERP', fileName);

const STOCK_MAPPING = {
  medida: ['MEDIDA'],
  anchoMm: ['ANCHO MM'],
  avanceMm: ['AVANCE MM'],
  material: ['MATERIAL'],
  columnas: ['COLUMNAS'],
  prepicado: ['PREPICADO'],
  cantidadXRollo: ['CANTIDAD X ROLLO'],
  cantidadMillares: ['CANTIDAD MILLARES'],
  etiqueta: ['ETIQUETA'],
  forma: ['FORMA'],
  tipoProducto: ['TIPO DE PRODUCTO'],
  caja: ['CAJA'],
  ubicacion: ['UBICACIÓN', 'UBICACION'],
};

const { sheetName, rows } = readWorkbookRows(filePath);
const mappedRows = normalizeRows(rows, STOCK_MAPPING);

const discarded = [];

const normalized = mappedRows
  .map((row, index) => {
  const caja = toDisplayString(row.caja);
  const conflictReasons = [];
  if (!caja) conflictReasons.push('CAJA_MISSING');

  return {
    sourceRow: index + 2,
    medida: toDisplayString(row.medida),
    anchoMm: parseNumber(row.anchoMm),
    avanceMm: parseNumber(row.avanceMm),
    material: toDisplayString(row.material),
    columnas: parseNumber(row.columnas),
    prepicado: toDisplayString(row.prepicado),
    cantidadXRollo: parseNumber(row.cantidadXRollo),
    cantidadMillares: parseNumber(row.cantidadMillares),
    etiqueta: toDisplayString(row.etiqueta),
    forma: toDisplayString(row.forma),
    tipoProducto: toDisplayString(row.tipoProducto),
    caja,
    ubicacion: toDisplayString(row.ubicacion),
    hasConflict: conflictReasons.length > 0,
    conflictReasons,
  };
  })
  .filter((row) => {
    const isJunk = ![row.medida, row.anchoMm, row.avanceMm, row.material, row.columnas, row.prepicado, row.cantidadXRollo, row.cantidadMillares, row.etiqueta, row.forma, row.tipoProducto, row.caja, row.ubicacion]
      .some((value) => typeof value === 'number' ? value !== 0 : String(value || '').trim());
    if (isJunk) discarded.push(row);
    return !isJunk;
  });

const outputPath = writeJsonOutput('erp-stock.normalized.json', {
  fileName,
  sheetName,
  totalRows: rows.length,
  normalizedRows: normalized.length,
  uniqueRows: normalized.length,
  conflicts: normalized.filter((row) => row.hasConflict).length,
  discarded: discarded.length,
  rows: normalized,
});

printSummary({
  fileName,
  sheetName,
  totalRows: rows.length,
  normalizedRows: normalized.length,
  uniqueRows: normalized.length,
  conflicts: normalized.filter((row) => row.hasConflict).length,
  discarded: discarded.length,
  outputPath,
});
