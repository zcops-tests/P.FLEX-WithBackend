import type { Request } from 'express';

export interface AuthPermissionEntry {
  deleted_at: Date | null;
  permission: {
    code: string;
  } | null;
}

export interface AuthRoleRecord {
  id: string;
  code: string;
  name: string;
  permissions: AuthPermissionEntry[];
}

export interface AuthUserRecord {
  id: string;
  username: string;
  name: string;
  active: boolean;
  password_hash: string;
  failed_login_attempts: number;
  last_failed_login_at: Date | null;
  locked_until: Date | null;
  password_changed_at: Date | null;
  created_at: Date;
  role: AuthRoleRecord;
}

export interface AccessUser {
  id: string;
  username: string;
  name: string;
  role: string;
  roleId: string | null;
  roleCode: string;
  roleName: string;
  permissionCodes: string[];
}

export interface PasswordSecurityStatus {
  status: 'VALID' | 'WARNING' | 'EXPIRED';
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  policyDays: number;
  warningDays: number;
  warningMessage?: string;
}

export interface JwtSessionPayload {
  sub: string;
  sid: string;
  iat?: number;
  exp?: number;
}

export interface JwtAccessPayload extends JwtSessionPayload {
  role?: string;
  roleCode?: string;
}

export interface AuthenticatedUser {
  id: string;
  sub: string;
  sid: string;
  role?: string;
  roleCode?: string;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export interface LoginFailureAuditInput {
  user?: AuthUserRecord;
  username: string;
  ipAddress: string;
  userAgent: string;
  reason: string;
  action?: 'LOGIN_FAILED' | 'LOGIN_BLOCKED';
  details?: Record<string, unknown>;
}
