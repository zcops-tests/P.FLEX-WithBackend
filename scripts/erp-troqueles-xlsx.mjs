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

const fileName = 'TROQUELES.xlsx';
const filePath = path.join(process.cwd(), 'datosERP', fileName);

const DIE_MAPPING = {
  medida: ['MEDIDA'],
  ubicacion: ['UBICACIÓN', 'UBICACION'],
  serie: ['SERIE'],
  anchoMm: ['ANCHO MM'],
  avanceMm: ['AVANCE MM'],
  anchoPlg: ['ANCHO PLG'],
  avancePlg: ['AVANCE PLG'],
  z: ['Z'],
  columnas: ['COLUMNAS'],
  repeticiones: ['REPETICIONES'],
  material: ['MATERIAL'],
  forma: ['FORMA'],
  cliente: ['CLIENTE'],
  observaciones: ['OBSERVACIONES'],
  ingreso: ['INGRESO'],
  pb: ['PB'],
  sepAva: ['SEP/AVA'],
  estado: ['ESTADO'],
  cantidad: ['CANTIDAD'],
  almacen: ['ALMACEN', 'ALMACÉN'],
  mtlAcum: ['MTL ACUM.', 'MTL ACUM'],
  tipoTroquel: ['TIPO DE TROQUEL'],
};

const { sheetName, rows } = readWorkbookRows(filePath);
const mappedRows = normalizeRows(rows, DIE_MAPPING);

const discarded = [];

const normalized = mappedRows
  .map((row, index) => {
  const serie = toDisplayString(row.serie);
  const cliente = toDisplayString(row.cliente);
  const conflictReasons = [];
  if (!serie) conflictReasons.push('SERIE_REQUIRED');
  if (!cliente) conflictReasons.push('CLIENT_REQUIRED');

  return {
    sourceRow: index + 2,
    medida: toDisplayString(row.medida),
    ubicacion: toDisplayString(row.ubicacion),
    serie,
    anchoMm: parseNumber(row.anchoMm),
    avanceMm: parseNumber(row.avanceMm),
    anchoPlg: parseNumber(row.anchoPlg),
    avancePlg: parseNumber(row.avancePlg),
    z: toDisplayString(row.z),
    columnas: parseNumber(row.columnas),
    repeticiones: parseNumber(row.repeticiones),
    material: toDisplayString(row.material),
    forma: toDisplayString(row.forma),
    cliente,
    observaciones: toDisplayString(row.observaciones),
    ingreso: parseExcelDate(row.ingreso),
    pb: toDisplayString(row.pb),
    sepAva: toDisplayString(row.sepAva),
    estado: toDisplayString(row.estado) || 'OK',
    cantidad: parseNumber(row.cantidad),
    almacen: toDisplayString(row.almacen),
    mtlAcum: parseNumber(row.mtlAcum) ?? 0,
    tipoTroquel: toDisplayString(row.tipoTroquel),
    hasConflict: conflictReasons.length > 0,
    conflictReasons,
  };
  })
  .filter((row) => {
    const isJunk = ![row.serie, row.cliente, row.medida, row.material, row.forma, row.anchoMm, row.avanceMm]
      .some((value) => typeof value === 'number' ? value !== 0 : String(value || '').trim());
    if (isJunk) discarded.push(row);
    return !isJunk;
  });

const deduped = new Map();
for (const row of normalized) {
  deduped.set(row.serie || `__empty__${row.sourceRow}`, row);
}

const outputRows = Array.from(deduped.values());
const outputPath = writeJsonOutput('erp-troqueles.normalized.json', {
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
