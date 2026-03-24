function buildUtcDate(year: number, month: number, day: number): Date | undefined {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? parsed
    : undefined;
}

function parseExcelSerialDate(serial: number): Date | undefined {
  if (!Number.isFinite(serial) || serial <= 0) {
    return undefined;
  }

  return new Date(Date.UTC(1899, 11, 30) + Math.trunc(serial) * 86400000);
}

function parseFlexibleDateInput(value: Date | string | number | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'number') {
    return parseExcelSerialDate(value);
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }

  if (/^\d{5,6}$/.test(text)) {
    return parseExcelSerialDate(Number(text));
  }

  const yyyymmddMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return buildUtcDate(Number(year), Number(month), Number(day));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    return buildUtcDate(year, month, day);
  }

  const dmyMatch = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:\s+.*)?$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const normalizedYear = year.length === 2 ? Number(`20${year}`) : Number(year);
    return buildUtcDate(normalizedYear, Number(month), Number(day));
  }

  const ymdMatch = text.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:\s+.*)?$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return buildUtcDate(Number(year), Number(month), Number(day));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function normalizeOptionalDateInput(value: Date | string | number | null | undefined): Date | undefined {
  return parseFlexibleDateInput(value);
}

export function normalizeOptionalDateStringInput(value: Date | string | number | null | undefined): string | undefined {
  const parsed = parseFlexibleDateInput(value);
  return parsed ? parsed.toISOString().slice(0, 10) : undefined;
}
