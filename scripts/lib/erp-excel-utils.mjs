import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

export function normalizeString(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function toDisplayString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim().replace(/[^0-9,.\-]/g, '');
  if (!text) return null;

  const commaLooksLikeThousands = text.includes(',')
    && !text.includes('.')
    && /^-?\d{1,3}(,\d{3})+$/.test(text);
  const normalized = text.includes(',') && text.includes('.')
    ? text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '')
    : commaLooksLikeThousands
      ? text.replace(/,/g, '')
      : text.includes(',')
        ? text.replace(',', '.')
        : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseExcelDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return '';

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return '';

  const [, dd, mm, yy] = match;
  const year = yy.length === 2 ? `20${yy}` : yy;
  const normalized = new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
  return Number.isNaN(normalized.getTime()) ? '' : normalized.toISOString().slice(0, 10);
}

export function resolveMappingKeys(rawRows, mapping) {
  const sampleRows = rawRows.slice(0, 25);
  const sampleKeys = Array.from(new Set(sampleRows.flatMap((row) => Object.keys(row || {}))));

  return Object.fromEntries(
    Object.entries(mapping).map(([targetKey, candidates]) => [
      targetKey,
      findMatchingKey(sampleKeys, candidates),
    ]),
  );
}

function findMatchingKey(rowKeys, candidates) {
  const normalizedKeys = rowKeys.map((key) => ({
    original: key,
    normalized: normalizeString(key),
  }));

  const normalizedCandidates = candidates
    .map((candidate) => normalizeString(candidate))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  for (const candidate of normalizedCandidates) {
    const exactMatch = normalizedKeys.find((entry) => entry.normalized === candidate);
    if (exactMatch) return exactMatch.original;
  }

  for (const candidate of normalizedCandidates) {
    if (candidate.length < 4) continue;
    const fuzzyMatch = normalizedKeys.find((entry) =>
      entry.normalized.includes(candidate) || candidate.includes(entry.normalized),
    );
    if (fuzzyMatch) return fuzzyMatch.original;
  }

  return undefined;
}

export function normalizeRows(rawRows, mapping) {
  const resolved = resolveMappingKeys(rawRows, mapping);
  return rawRows.map((row) => {
    const normalized = {};
    for (const [targetKey, sourceKey] of Object.entries(resolved)) {
      if (sourceKey) {
        normalized[targetKey] = row[sourceKey];
      }
    }
    return normalized;
  });
}

export function readWorkbookRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  if (!workbook.SheetNames?.length) {
    throw new Error(`El archivo ${path.basename(filePath)} no contiene hojas.`);
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  return { workbook, sheetName, rows };
}

export function ensureOutputDir() {
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

export function writeJsonOutput(fileName, payload) {
  const outputDir = ensureOutputDir();
  const fullPath = path.join(outputDir, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), 'utf8');
  return fullPath;
}

export function printSummary(summary) {
  console.log(`Archivo: ${summary.fileName}`);
  console.log(`Hoja: ${summary.sheetName}`);
  console.log(`Filas leídas: ${summary.totalRows}`);
  if (typeof summary.normalizedRows === 'number') {
    console.log(`Filas normalizadas: ${summary.normalizedRows}`);
  }
  if (typeof summary.uniqueRows === 'number') {
    console.log(`Filas únicas: ${summary.uniqueRows}`);
  }
  if (typeof summary.conflicts === 'number') {
    console.log(`Conflictos: ${summary.conflicts}`);
  }
  if (typeof summary.discarded === 'number') {
    console.log(`Descartados: ${summary.discarded}`);
  }
  console.log(`Salida JSON: ${summary.outputPath}`);
}
