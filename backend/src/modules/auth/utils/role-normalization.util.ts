export type FrontendRole =
  | 'Sistemas'
  | 'Jefatura'
  | 'Supervisor'
  | 'Operario'
  | 'Asistente'
  | 'Asistente de Producción'
  | 'Encargado de Clisés, Troqueles y Tintas'
  | 'Encargado de Clisés y Troqueles'
  | 'Encargado de Tintas'
  | 'Encargado de Troquelado y Rebobinado'
  | 'Jefe de Calidad'
  | 'Auditor';

const FRONTEND_ROLE_CAPABILITIES: Record<FrontendRole, FrontendRole[]> = {
  Sistemas: [
    'Sistemas',
    'Jefatura',
    'Supervisor',
    'Operario',
    'Asistente',
    'Asistente de Producción',
    'Encargado de Clisés, Troqueles y Tintas',
    'Encargado de Clisés y Troqueles',
    'Encargado de Tintas',
    'Encargado de Troquelado y Rebobinado',
    'Jefe de Calidad',
    'Auditor',
  ],
  Jefatura: ['Jefatura'],
  Supervisor: ['Supervisor', 'Operario'],
  Operario: ['Operario'],
  Asistente: ['Asistente'],
  'Asistente de Producción': ['Asistente de Producción', 'Asistente', 'Operario'],
  'Encargado de Clisés, Troqueles y Tintas': [
    'Encargado de Clisés, Troqueles y Tintas',
    'Encargado de Clisés y Troqueles',
    'Encargado de Tintas',
  ],
  'Encargado de Clisés y Troqueles': ['Encargado de Clisés y Troqueles'],
  'Encargado de Tintas': ['Encargado de Tintas'],
  'Encargado de Troquelado y Rebobinado': ['Encargado de Troquelado y Rebobinado', 'Operario'],
  'Jefe de Calidad': ['Jefe de Calidad'],
  Auditor: ['Auditor'],
};

export function normalizeRoleName(value: string | null | undefined): FrontendRole {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (normalized.includes('AUDIT')) return 'Auditor';
  if (normalized.includes('QUALITY') || (normalized.includes('CALIDAD') && normalized.includes('JEFE'))) return 'Jefe de Calidad';
  if (normalized.includes('PRODUCTION_ASSISTANT') || normalized.includes('ASISTENTE DE PRODUCCION')) return 'Asistente de Producción';
  if ((normalized.includes('CLISE') || normalized.includes('CLICHE')) && normalized.includes('TINTA')) return 'Encargado de Clisés, Troqueles y Tintas';
  if (normalized.includes('CLISE') || normalized.includes('CLICHE')) return 'Encargado de Clisés y Troqueles';
  if (normalized.includes('TROQUELADO') || normalized.includes('REBOBINADO') || normalized.includes('FINISHING')) return 'Encargado de Troquelado y Rebobinado';
  if (normalized.includes('TINTA') || normalized.includes('INK')) return 'Encargado de Tintas';
  if (normalized.includes('ADMIN') || normalized.includes('SISTEM')) return 'Sistemas';
  if (normalized.includes('SUPERVISOR')) return 'Supervisor';
  if (normalized.includes('PLANNER') || normalized.includes('ASIST')) return 'Asistente';
  if (normalized.includes('OPERATOR') || normalized.includes('OPERARIO')) return 'Operario';
  if (normalized.includes('WAREHOUSE') || normalized.includes('ENCARG')) return 'Encargado de Clisés, Troqueles y Tintas';
  if (normalized.includes('JEFAT') || normalized.includes('MANAGER') || normalized.includes('GEREN')) return 'Jefatura';
  return 'Jefatura';
}

export function getRoleCapabilities(role: string | null | undefined): FrontendRole[] {
  const normalizedRole = normalizeRoleName(role);
  return FRONTEND_ROLE_CAPABILITIES[normalizedRole];
}

export function hasRequiredRole(userRole: string | null | undefined, requiredRoles: string[]): boolean {
  const userCapabilities = new Set(getRoleCapabilities(userRole));
  return requiredRoles
    .map((role) => normalizeRoleName(role))
    .some((requiredRole) => userCapabilities.has(requiredRole));
}
