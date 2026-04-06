import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import type { AppConfig } from '../../config/env.validation';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { normalizeRoleName } from './utils/role-normalization.util';
import { DUMMY_PASSWORD_HASH } from './auth-security.config';
import type {
  AccessUser,
  AuthPermissionEntry,
  AuthUserRecord,
  JwtSessionPayload,
  LoginFailureAuditInput,
  PasswordSecurityStatus,
} from './auth.types';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const LOGIN_LOCKED_MESSAGE = 'Too many login attempts. Try again later.';
const PASSWORD_EXPIRED_MESSAGE =
  'La contraseña expiró. Solicita un restablecimiento para volver a ingresar.';
type AuthStringConfigKey =
  | 'JWT_ACCESS_SECRET'
  | 'JWT_REFRESH_SECRET'
  | 'JWT_ACCESS_EXPIRATION'
  | 'JWT_REFRESH_EXPIRATION';
type AuthNumericConfigKey =
  | 'AUTH_LOGIN_MAX_ATTEMPTS'
  | 'AUTH_LOGIN_LOCK_MINUTES';

interface AuthSecurityPolicy {
  failedLoginMaxAttempts: number;
  passwordPolicyDays: number;
  passwordExpiryWarningDays: number;
  loginLockMinutes: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService<AppConfig, true>,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const now = new Date();
    const securityPolicy = await this.resolveSecurityPolicy();
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      await this.consumeDummyPasswordCheck(loginDto.password);
      await this.auditLoginFailure({
        username: loginDto.username,
        ipAddress,
        userAgent,
        reason: user ? 'INACTIVE_USER' : 'UNKNOWN_USER',
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (this.isLoginTemporarilyLocked(user, now)) {
      await this.auditLoginFailure({
        user,
        username: loginDto.username,
        ipAddress,
        userAgent,
        action: 'LOGIN_BLOCKED',
        reason: 'LOCKED',
        details: {
          lockedUntil: user.locked_until,
          failedAttempts: user.failed_login_attempts,
        },
      });
      throw new HttpException(
        LOGIN_LOCKED_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.isPasswordLoginAllowed(user)) {
      await this.consumeDummyPasswordCheck(loginDto.password);
      await this.auditLoginFailure({
        user,
        username: loginDto.username,
        ipAddress,
        userAgent,
        reason: 'PASSWORD_LOGIN_NOT_ALLOWED',
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!user.password_hash) {
      await this.consumeDummyPasswordCheck(loginDto.password);
      await this.registerFailedLoginAttempt(
        user,
        ipAddress,
        userAgent,
        'PASSWORD_NOT_CONFIGURED',
        securityPolicy,
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      await this.registerFailedLoginAttempt(
        user,
        ipAddress,
        userAgent,
        'INVALID_PASSWORD',
        securityPolicy,
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordSecurity = this.evaluatePasswordSecurity(user, securityPolicy);
    if (passwordSecurity?.status === 'EXPIRED') {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: 0,
            last_failed_login_at: null,
            locked_until: null,
          },
        }),
        this.prisma.auditLog.create({
          data: {
            user_id: user.id,
            user_name_snapshot: user.name,
            role_code_snapshot: user.role.code || null,
            entity: 'users',
            entity_id: user.id,
            action: 'LOGIN_BLOCKED',
            ip_address: ipAddress,
            user_agent: userAgent,
            new_values: {
              username: user.username,
              reason: 'PASSWORD_EXPIRED',
              security: passwordSecurity,
            } as unknown as Prisma.InputJsonValue,
          },
        }),
      ]);
      throw new UnauthorizedException(PASSWORD_EXPIRED_MESSAGE);
    }

    const sessionId = uuid.v4();
    const accessUser = this.mapAccessUser(user);
    const tokens = await this.generateTokens(
      user.id,
      sessionId,
      accessUser.roleName,
      accessUser.roleCode,
    );
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.$transaction([
      this.prisma.userSession.create({
        data: {
          id: sessionId,
          user_id: user.id,
          device_id: loginDto.deviceId,
          device_name: loginDto.deviceName,
          device_type: loginDto.deviceType,
          device_profile: loginDto.deviceProfile,
          ip_address: ipAddress,
          user_agent: userAgent,
          last_seen_at: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: user.id,
          session_id: sessionId,
          user_name_snapshot: user.name,
          role_code_snapshot: user.role.code,
          entity: 'users',
          entity_id: user.id,
          action: 'LOGIN',
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          user_id: user.id,
          session_id: sessionId,
          token_hash: refreshTokenHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          last_login_at: now,
          failed_login_attempts: 0,
          last_failed_login_at: null,
          locked_until: null,
        },
      }),
    ]);

    return {
      user: accessUser,
      ...tokens,
      sessionId,
      security: passwordSecurity,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // Basic verification of JWT (signature/expiry)
    let payload: JwtSessionPayload;
    try {
      payload = this.jwtService.verify<JwtSessionPayload>(dto.refreshToken, {
        secret: this.getRequiredConfigString('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { sub: userId, sid: sessionId } = payload;

    // Check refresh token in database (rotation/revocation check)
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        session_id: sessionId,
        revoked_at: null,
      },
    });

    if (!storedToken || storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const isMatch = await bcrypt.compare(
      dto.refreshToken,
      storedToken.token_hash,
    );
    if (!isMatch) {
      // Possible reuse attack! Revoke all tokens for this session
      await this.prisma.refreshToken.updateMany({
        where: { session_id: sessionId },
        data: { revoked_at: new Date() },
      });
      throw new ForbiddenException(
        'Refresh token reused - compromise detected',
      );
    }

    // Generate new pair
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('User inactive');
    }

    this.assertUserCanUsePasswordLogin(user);

    const tokens = await this.generateTokens(
      user.id,
      sessionId,
      user.role.name || normalizeRoleName(user.role.code),
      user.role.code,
    );

    // Rotate token (revoke old, create new)
    const newHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked_at: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          user_id: user.id,
          session_id: sessionId,
          token_hash: newHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          rotated_from_token_id: storedToken.id,
        },
      }),
      this.prisma.userSession.update({
        where: { id: sessionId },
        data: { last_seen_at: new Date() },
      }),
    ]);

    return {
      ...tokens,
      user: this.mapAccessUser(user),
      sessionId,
    };
  }

  async logout(sessionId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: sessionId },
        data: { active: false, revoked_at: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session_id: sessionId },
        data: { revoked_at: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: userId,
          session_id: sessionId,
          entity: 'users',
          entity_id: userId,
          action: 'LOGOUT',
        },
      }),
    ]);
  }

  async me(userId: string) {
    const user = await this.findUserAccessById(userId);
    if (!user || !user.active) {
      throw new UnauthorizedException('User inactive');
    }
    this.assertUserCanUsePasswordLogin(user);
    return this.mapAccessUser(user);
  }

  private async generateTokens(
    userId: string,
    sessionId: string,
    role: string,
    roleCode: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, sid: sessionId, role, roleCode },
        {
          secret: this.getRequiredConfigString('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', {
            infer: true,
          }),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, sid: sessionId },
        {
          secret: this.getRequiredConfigString('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', {
            infer: true,
          }),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async findUserAccessById(
    userId: string,
  ): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  private mapAccessUser(user: AuthUserRecord): AccessUser {
    const permissionCodes = user.role.permissions
      .filter((entry: AuthPermissionEntry) => !entry.deleted_at)
      .map((entry: AuthPermissionEntry) => entry.permission?.code ?? null)
      .filter((code): code is string => Boolean(code));

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.name || normalizeRoleName(user.role.code),
      roleId: user.role.id || null,
      roleCode: user.role.code || '',
      roleName: user.role.name || normalizeRoleName(user.role.code),
      permissionCodes,
    };
  }

  private isPasswordLoginAllowed(user: Pick<AuthUserRecord, 'role'>): boolean {
    const roleCode = String(user.role.code || '').toUpperCase();
    return roleCode !== 'OPERATOR';
  }

  private assertUserCanUsePasswordLogin(user: Pick<AuthUserRecord, 'role'>) {
    if (!this.isPasswordLoginAllowed(user)) {
      throw new ForbiddenException(
        'El operario no puede iniciar sesion directa. Debe identificarse desde un terminal anfitrion.',
      );
    }
  }

  private isLoginTemporarilyLocked(
    user: Pick<AuthUserRecord, 'locked_until'>,
    currentTime: Date,
  ): boolean {
    return (
      user.locked_until instanceof Date &&
      user.locked_until.getTime() > currentTime.getTime()
    );
  }

  private getPositiveConfigNumber(
    key: AuthNumericConfigKey,
    fallback: number,
  ): number {
    const value = Number(
      this.configService.get(key, { infer: true }) ?? fallback,
    );
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private getRequiredConfigString(key: AuthStringConfigKey): string {
    return this.configService.get(key, { infer: true });
  }

  private getLoginAttemptWindowMs(lockMinutes: number): number {
    return lockMinutes * 60 * 1000;
  }

  private async consumeDummyPasswordCheck(password: string) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
  }

  private async registerFailedLoginAttempt(
    user: AuthUserRecord,
    ipAddress: string,
    userAgent: string,
    reason: string,
    securityPolicy: AuthSecurityPolicy,
  ): Promise<void> {
    const now = new Date();
    const attemptWindowMs = this.getLoginAttemptWindowMs(
      securityPolicy.loginLockMinutes,
    );
    const isWithinWindow =
      user.last_failed_login_at instanceof Date &&
      now.getTime() - user.last_failed_login_at.getTime() <= attemptWindowMs;
    const failedAttempts = isWithinWindow
      ? Number(user.failed_login_attempts || 0) + 1
      : 1;
    const shouldLock =
      failedAttempts >= securityPolicy.failedLoginMaxAttempts;
    const lockedUntil = shouldLock
      ? new Date(now.getTime() + attemptWindowMs)
      : null;
    const auditPayload = {
      username: user.username,
      reason,
      failedAttempts,
      maxAttempts: securityPolicy.failedLoginMaxAttempts,
      lockedUntil,
      thresholdReached: shouldLock,
      alertMode: 'AUDIT_AND_OUTBOX',
      ipAddress,
      userAgent,
    };

    const operations: any[] = [
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: failedAttempts,
          last_failed_login_at: now,
          locked_until: lockedUntil,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: user.id,
          user_name_snapshot: user.name,
          role_code_snapshot: user.role.code || null,
          entity: 'users',
          entity_id: user.id,
          action: shouldLock ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
          ip_address: ipAddress,
          user_agent: userAgent,
          new_values: auditPayload as Prisma.InputJsonValue,
        },
      }),
    ];

    if (shouldLock) {
      operations.push(
        this.prisma.outboxEvent.create({
          data: {
            event_name: 'security.failed-login-threshold-reached',
            aggregate_type: 'users',
            aggregate_id: user.id,
            payload: {
              userId: user.id,
              username: user.username,
              roleCode: user.role.code || null,
              failedAttempts,
              maxAttempts: securityPolicy.failedLoginMaxAttempts,
              lockedUntil,
              reason,
              ipAddress,
              userAgent,
              emittedAt: now.toISOString(),
            } as Prisma.InputJsonValue,
            status: 'PENDING',
          },
        }),
      );
    }

    await this.prisma.$transaction(operations);
  }

  private async auditLoginFailure({
    user,
    username,
    ipAddress,
    userAgent,
    reason,
    action = 'LOGIN_FAILED',
    details,
  }: LoginFailureAuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        user_id: user?.id ?? null,
        user_name_snapshot: user?.name ?? username,
        role_code_snapshot: user?.role.code ?? null,
        entity: 'users',
        entity_id: user?.id ?? null,
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        new_values: {
          username,
          reason,
          ...details,
        } as Prisma.InputJsonValue,
      },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { user_id: userId, active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async revokeSession(sessionId: string, userId: string) {
    const [result] = await this.prisma.$transaction([
      this.prisma.userSession.updateMany({
        where: { id: sessionId, user_id: userId },
        data: { active: false, revoked_at: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session_id: sessionId, user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: userId,
          session_id: sessionId,
          entity: 'users',
          entity_id: userId,
          action: 'REVOKE_SESSION',
        },
      }),
    ]);

    return result;
  }

  async logoutAll(userId: string) {
    await this.prisma.$transaction([
      this.prisma.userSession.updateMany({
        where: { user_id: userId, active: true },
        data: { active: false, revoked_at: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: userId,
          entity: 'users',
          entity_id: userId,
          action: 'LOGOUT_ALL',
        },
      }),
    ]);

    return { message: 'All sessions revoked' };
  }

  private async resolveSecurityPolicy(): Promise<AuthSecurityPolicy> {
    const persistedConfig = await this.fetchSecurityConfig();

    return {
      failedLoginMaxAttempts: this.getPersistedOrFallbackNumber(
        persistedConfig?.failed_login_max_attempts,
        5,
        'AUTH_LOGIN_MAX_ATTEMPTS',
      ),
      passwordPolicyDays: this.getPersistedOrFallbackNumber(
        persistedConfig?.password_policy_days,
        90,
      ),
      passwordExpiryWarningDays: this.getPersistedOrFallbackNumber(
        persistedConfig?.password_expiry_warning_days,
        7,
      ),
      loginLockMinutes: this.getPositiveConfigNumber(
        'AUTH_LOGIN_LOCK_MINUTES',
        15,
      ),
    };
  }

  private async fetchSecurityConfig(): Promise<{
    failed_login_max_attempts?: number | null;
    password_policy_days?: number | null;
    password_expiry_warning_days?: number | null;
  } | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        failed_login_max_attempts: number | null;
        password_policy_days: number | null;
        password_expiry_warning_days: number | null;
      }>
    >(Prisma.sql`
      SELECT
        failed_login_max_attempts,
        password_policy_days,
        password_expiry_warning_days
      FROM system_config
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private getPersistedOrFallbackNumber(
    persistedValue: number | null | undefined,
    fallback: number,
    envKey?: AuthNumericConfigKey,
  ): number {
    const persisted = Number(persistedValue);
    if (Number.isFinite(persisted) && persisted > 0) {
      return persisted;
    }

    return envKey
      ? this.getPositiveConfigNumber(envKey, fallback)
      : fallback;
  }

  private evaluatePasswordSecurity(
    user: Pick<
      AuthUserRecord,
      'password_changed_at' | 'created_at' | 'role'
    >,
    securityPolicy: AuthSecurityPolicy,
  ): PasswordSecurityStatus | null {
    if (!this.isPasswordLoginAllowed(user)) {
      return null;
    }

    const baseDate = user.password_changed_at || user.created_at;
    if (!(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) {
      return null;
    }

    const expiresAt = new Date(baseDate.getTime());
    expiresAt.setDate(expiresAt.getDate() + securityPolicy.passwordPolicyDays);
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );

    if (daysUntilExpiry < 0) {
      return {
        status: 'EXPIRED',
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        policyDays: securityPolicy.passwordPolicyDays,
        warningDays: securityPolicy.passwordExpiryWarningDays,
        warningMessage: PASSWORD_EXPIRED_MESSAGE,
      };
    }

    if (daysUntilExpiry <= securityPolicy.passwordExpiryWarningDays) {
      return {
        status: 'WARNING',
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        policyDays: securityPolicy.passwordPolicyDays,
        warningDays: securityPolicy.passwordExpiryWarningDays,
        warningMessage:
          daysUntilExpiry === 0
            ? 'Tu contraseña vence hoy. Cámbiala cuanto antes.'
            : `Tu contraseña vence en ${daysUntilExpiry} día${daysUntilExpiry === 1 ? '' : 's'}.`,
      };
    }

    return {
      status: 'VALID',
      expiresAt: expiresAt.toISOString(),
      daysUntilExpiry,
      policyDays: securityPolicy.passwordPolicyDays,
      warningDays: securityPolicy.passwordExpiryWarningDays,
    };
  }
}
