
export type UserRole =
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

export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  assignedAreas?: string[];
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface SystemConfig {
  shiftName1: string;
  shiftTime1: string;
  shiftName2: string;
  shiftTime2: string;
  passwordExpiryWarningDays: number;
  passwordPolicyDays: number;
  plantName: string;
  autoLogoutMinutes: number;
  operatorMessage: string;
}
