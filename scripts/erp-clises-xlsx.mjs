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

const fileName = 'CLISSES.xlsx';
const filePath = path.join(process.cwd(), 'datosERP', fileName);

const CLISE_MAPPING = {
  item: ['ITEM'],
  ubicacion: ['UBICACIÓN', 'UBICACION'],
  descripcion: ['DESCRIPCIÓN', 'DESCRIPCION'],
  cliente: ['CLIENTE'],
  z: ['Z'],
  estandar: ['ESTÁNDAR', 'ESTANDAR'],
  medidas: ['MEDIDAS', 'MEDIDA'],
  troquel: ['TROQUEL'],
  ancho: ['ANCHO'],
  avance: ['AVANCE'],
  col: ['COL'],
  rep: ['REP'],
  cantidad: ['CANTIDAD'],
  espesor: ['ESPESOR'],
  ingreso: ['INGRESO'],
  obs: ['OBS'],
  maq: ['MAQ'],
  colores: ['COLORES'],
  fichaFler: ['N° FICHA FLER', 'Nº FICHA FLER'],
  mtlAcum: ['MTL ACUM.', 'MTL ACUM'],
};

const { sheetName, rows } = readWorkbookRows(filePath);
const mappedRows = normalizeRows(rows, CLISE_MAPPING);

const discarded = [];

const normalized = mappedRows
  .map((row, index) => {
  const item = toDisplayString(row.item);
  const cliente = toDisplayString(row.cliente);
  const conflictReasons = [];
  if (!item) conflictReasons.push('ITEM_REQUIRED');
  if (!cliente) conflictReasons.push('CLIENT_REQUIRED');

  return {
    sourceRow: index + 2,
    item,
    ubicacion: toDisplayString(row.ubicacion),
    descripcion: toDisplayString(row.descripcion),
    cliente,
    z: toDisplayString(row.z),
    estandar: toDisplayString(row.estandar),
    medidas: toDisplayString(row.medidas),
    troquel: toDisplayString(row.troquel),
    ancho: parseNumber(row.ancho),
    avance: parseNumber(row.avance),
    col: parseNumber(row.col),
    rep: parseNumber(row.rep),
    cantidad: parseNumber(row.cantidad),
    espesor: toDisplayString(row.espesor),
    ingreso: parseExcelDate(row.ingreso),
    obs: toDisplayString(row.obs),
    maq: toDisplayString(row.maq),
    colores: toDisplayString(row.colores),
    fichaFler: toDisplayString(row.fichaFler),
    mtlAcum: parseNumber(row.mtlAcum) ?? 0,
    hasConflict: conflictReasons.length > 0,
    conflictReasons,
  };
  })
  .filter((row) => {
    const isJunk = ![row.item, row.cliente, row.descripcion, row.troquel, row.ancho, row.avance]
      .some((value) => typeof value === 'number' ? value !== 0 : String(value || '').trim());
    if (isJunk) discarded.push(row);
    return !isJunk;
  });

const deduped = new Map();
for (const row of normalized) {
  deduped.set(row.item || `__empty__${row.sourceRow}`, row);
}

const outputRows = Array.from(deduped.values());
const outputPath = writeJsonOutput('erp-clises.normalized.json', {
  fileName,
  sheetName,
  totalRows: rows.length,
  normalizedRows: normalized.length,
  uniqueRows: outputRows.length,
  conflicts: outputRows.filter((row) => row.hasConflict).length,
  discarded: discarded.length,
  rows: outputRows,
});

printSummary({
  fileName,
  sheetName,
  totalRows: rows.length,
  normalizedRows: normalized.length,
  uniqueRows: outputRows.length,
  conflicts: outputRows.filter((row) => row.hasConflict).length,
  discarded: discarded.length,
  outputPath,
});
