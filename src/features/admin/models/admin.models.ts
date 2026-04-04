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
  shiftEndTime1: string;
  shiftName2: string;
  shiftTime2: string;
  shiftEndTime2: string;
  passwordExpiryWarningDays: number;
  passwordPolicyDays: number;
  plantName: string;
  autoLogoutMinutes: number;
  operatorMessage: string;
  timezoneName?: string;
  maintenanceModeEnabled: boolean;
  maintenanceMessage: string;
  offlineRetentionDays: number;
  backupFrequency: string;
  conflictResolutionPolicy: string;
  productionAssistantMessage: string;
  finishingManagerMessage: string;
  managementMessage: string;
  failedLoginAlertMode: string;
  failedLoginMaxAttempts: number;
  otAllowPartialClose: boolean;
  otAllowCloseWithWaste: boolean;
  otAllowForcedClose: boolean;
  otForcedCloseRequiresReason: boolean;
}

export interface ConfigShiftContract {
  id?: string;
  code: 'T1' | 'T2' | string;
  name: string;
  startTime: string;
  endTime: string;
  start_time?: string;
  end_time?: string;
  crosses_midnight?: boolean;
  active?: boolean;
}

export interface ConfigAuditPreviewItem {
  id: string | number;
  user_name_snapshot?: string | null;
  role_code_snapshot?: string | null;
  entity: string;
  entity_id?: string | null;
  action: string;
  old_values?: unknown;
  new_values?: unknown;
  created_at: string;
}

export interface SystemConfigContract {
  system_config: SystemConfig;
  shifts: ConfigShiftContract[];
  audit_preview: ConfigAuditPreviewItem[];
}
