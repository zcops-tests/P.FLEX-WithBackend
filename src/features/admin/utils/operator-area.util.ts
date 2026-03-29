export const OPERATOR_PRODUCTION_AREAS = [
  'Impresión',
  'Troquelado',
  'Rebobinado',
  'Empaquetado',
] as const;

export type OperatorProductionArea =
  (typeof OPERATOR_PRODUCTION_AREAS)[number];

const OPERATOR_AREA_ALIASES: Record<OperatorProductionArea, string[]> = {
  'Impresión': ['IMP', 'IMPR', 'IMPRENTA', 'IMPRESION', 'PRINT'],
  Troquelado: ['TROQ', 'TROQUELADO', 'DIECUT', 'DIECUTTING', 'TRQ'],
  Rebobinado: ['REBOB', 'REBOBINADO', 'REWIND', 'RWD'],
  Empaquetado: ['EMPAQ', 'EMPAQUETADO', 'PACK', 'PACKAGING', 'PKG'],
};

export function normalizeOperatorAreaToken(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function resolveCanonicalOperatorAreas(
  values: unknown,
): OperatorProductionArea[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalizedAreas = new Set<OperatorProductionArea>();

  for (const value of values) {
    for (const area of expandOperatorAreaAliases(value)) {
      normalizedAreas.add(area);
    }
  }

  return OPERATOR_PRODUCTION_AREAS.filter((area) => normalizedAreas.has(area));
}

export function isOperatorAreaMatch(
  area: OperatorProductionArea,
  value: unknown,
) {
  return expandOperatorAreaAliases(value).includes(area);
}

function expandOperatorAreaAliases(value: unknown): OperatorProductionArea[] {
  const token = normalizeOperatorAreaToken(readOperatorAreaValue(value));
  if (!token) {
    return [];
  }

  if (token.includes('ACABADO') || token.includes('FINISH')) {
    return ['Rebobinado', 'Empaquetado'];
  }

  return OPERATOR_PRODUCTION_AREAS.filter((area) =>
    OPERATOR_AREA_ALIASES[area].some(
      (alias) => token === alias || token.includes(alias),
    ),
  );
}

function readOperatorAreaValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as {
    name?: unknown;
    code?: unknown;
    area?: {
      name?: unknown;
      code?: unknown;
    };
  };

  return String(record.area?.name || record.area?.code || record.name || record.code || '');
}
