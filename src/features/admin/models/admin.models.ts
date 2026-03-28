export type UserRole = string;

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  roleId?: string | null;
  roleCode?: string | null;
  roleName?: string;
  permissionCodes?: string[];
  active: boolean;
  lastLoginAt?: string | null;
  assignedAreas?: string[];
  password?: string;
}

export interface RoleDefinition {
  id: string;
  code: string;
  name: string;
  legacyName?: string;
  description: string;
  permissions: PermissionDefinition[];
  permissionCodes: string[];
  active: boolean;
  assignedUserCount?: number;
  isSystem?: boolean;
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
