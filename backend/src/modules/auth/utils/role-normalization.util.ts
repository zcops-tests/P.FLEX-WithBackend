export type FrontendRole = 'Jefatura' | 'Supervisor' | 'Asistente' | 'Operario' | 'Encargado' | 'Sistemas';

const FRONTEND_ROLE_CAPABILITIES: Record<FrontendRole, FrontendRole[]> = {
  Sistemas: ['Sistemas', 'Jefatura', 'Supervisor', 'Asistente', 'Operario', 'Encargado'],
  Jefatura: ['Jefatura', 'Supervisor', 'Asistente', 'Operario', 'Encargado'],
  Supervisor: ['Supervisor', 'Operario', 'Encargado'],
  Asistente: ['Asistente'],
  Operario: ['Operario'],
  Encargado: ['Encargado'],
};

export function normalizeRoleName(value: string | null | undefined): FrontendRole {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (normalized.includes('ADMIN') || normalized.includes('SISTEM')) return 'Sistemas';
  if (normalized.includes('SUPERVISOR')) return 'Supervisor';
  if (normalized.includes('PLANNER') || normalized.includes('ASIST')) return 'Asistente';
  if (normalized.includes('OPERATOR') || normalized.includes('OPERARIO')) return 'Operario';
  if (normalized.includes('WAREHOUSE') || normalized.includes('ENCARG')) return 'Encargado';
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
