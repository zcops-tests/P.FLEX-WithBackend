export interface DefaultProductionArea {
  code: string;
  name: string;
}

export const DEFAULT_PRODUCTION_AREAS: DefaultProductionArea[] = [
  { code: 'IMP', name: 'Imprenta' },
  { code: 'TROQ', name: 'Troquelado' },
  { code: 'REBOB', name: 'Rebobinado' },
  { code: 'EMPAQ', name: 'Empaquetado' },
];
