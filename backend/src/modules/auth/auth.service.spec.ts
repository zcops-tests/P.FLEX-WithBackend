import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import type { AppConfig } from '../../config/env.validation';
import { DUMMY_PASSWORD_HASH } from './auth-security.config';
import { AuthService } from './auth.service';
import type {
  AuthRoleRecord,
  AuthUserRecord,
  JwtSessionPayload,
} from './auth.types';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed'),
}));

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

type PrismaServiceMock = {
  $transaction: jest.Mock<Promise<unknown[]>, [Promise<unknown>[]]>;
  $queryRaw: jest.Mock<Promise<any[]>, [unknown]>;
  user: {
    findUnique: jest.Mock<Promise<AuthUserRecord | null>, [unknown]>;
    update: jest.Mock<Promise<unknown>, [unknown]>;
  };
  userSession: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
    update: jest.Mock<Promise<unknown>, [unknown]>;
    updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
  };
  refreshToken: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
    update: jest.Mock<Promise<unknown>, [unknown]>;
    updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    findFirst: jest.Mock<
      Promise<{ id: string; token_hash: string; expires_at: Date } | null>,
      [unknown]
    >;
  };
  auditLog: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  outboxEvent: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
};

type JwtServiceMock = {
  signAsync: jest.Mock<Promise<string>, [object, object]>;
  verify: jest.Mock<JwtSessionPayload, [string, object]>;
};

type ConfigServiceMock = {
  get: jest.Mock<
    AppConfig[keyof AppConfig],
    [keyof AppConfig, { infer: true }?]
  >;
};

const defaultRole: AuthRoleRecord = {
  id: 'role-1',
  code: 'SUPERVISOR',
  name: 'Supervisor',
  permissions: [],
};

const configValues: AppConfig = {
  NODE_ENV: 'test',
  PORT: 3000,
  REQUEST_BODY_LIMIT_MB: 25,
  DATABASE_URL: 'mysql://test',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  AUTH_LOGIN_MAX_ATTEMPTS: 5,
  AUTH_LOGIN_LOCK_MINUTES: 15,
  AUTH_LOGIN_THROTTLE_LIMIT: 12,
  AUTH_LOGIN_THROTTLE_TTL_MS: 60000,
  AUTH_LOGIN_THROTTLE_BLOCK_MS: 120000,
  AUTH_REFRESH_THROTTLE_LIMIT: 30,
  AUTH_REFRESH_THROTTLE_TTL_MS: 60000,
  AUTH_REFRESH_THROTTLE_BLOCK_MS: 60000,
};

const buildUser = (
  overrides: Partial<AuthUserRecord> & { role?: Partial<AuthRoleRecord> } = {},
): AuthUserRecord => ({
  id: 'user-1',
  username: '12345678',
  name: 'Supervisor Uno',
  active: true,
  password_hash: 'stored-hash',
  failed_login_attempts: 0,
  last_failed_login_at: null,
  locked_until: null,
  password_changed_at: new Date('2026-03-25T10:00:00.000Z'),
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  role: {
    ...defaultRole,
    ...overrides.role,
    permissions: overrides.role?.permissions ?? defaultRole.permissions,
  },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaServiceMock;
  let jwtService: JwtServiceMock;
  let configService: ConfigServiceMock;
  let compareMock: jest.Mock<Promise<boolean>, [string, string]>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations) => Promise.all(operations)),
      $queryRaw: jest.fn().mockResolvedValue([
        {
          failed_login_max_attempts: 3,
          password_policy_days: 90,
          password_expiry_warning_days: 7,
        },
      ]),
      user: {
        findUnique: jest.fn<Promise<AuthUserRecord | null>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      userSession: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        updateMany: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        findMany: jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([]),
      },
      refreshToken: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        updateMany: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
        findFirst: jest.fn<
          Promise<{ id: string; token_hash: string; expires_at: Date } | null>,
          [unknown]
        >(),
      },
      auditLog: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
      outboxEvent: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
      },
    };

    jwtService = {
      signAsync: jest.fn<Promise<string>, [object, object]>().mockResolvedValue(
        'signed-token',
      ),
      verify: jest.fn<JwtSessionPayload, [string, object]>(),
    };

    configService = {
      get: jest.fn((key) => configValues[key]),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService<AppConfig, true>,
    );

    compareMock = bcrypt.compare as unknown as jest.Mock<
      Promise<boolean>,
      [string, string]
    >;
    compareMock.mockReset();
    compareMock.mockImplementation((_, hash) =>
      Promise.resolve(hash !== DUMMY_PASSWORD_HASH),
    );
  });

  it('clears failed login state after a successful login and returns password warning metadata', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        failed_login_attempts: 2,
        last_failed_login_at: new Date(),
        password_changed_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
      }),
    );

    const result = await service.login(
      { username: '12345678', password: 'secret' },
      '127.0.0.1',
      'jest',
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          failed_login_attempts: 0,
          last_failed_login_at: null,
          locked_until: null,
          last_login_at: expect.any(Date),
        }),
      }),
    );
    expect(result.security).toEqual(
      expect.objectContaining({
        status: 'WARNING',
        policyDays: 90,
        warningDays: 7,
      }),
    );
    expect(result.security.warningMessage).toContain('vence');
  });

  it('locks the account using failed_login_max_attempts from system_config and emits outbox event', async () => {
    compareMock.mockResolvedValueOnce(false);
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        failed_login_attempts: 2,
        last_failed_login_at: new Date(),
      }),
    );

    await expect(
      service.login(
        { username: '12345678', password: 'bad-pass' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          failed_login_attempts: 3,
          last_failed_login_at: expect.any(Date),
          locked_until: expect.any(Date),
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LOGIN_LOCKED',
          new_values: expect.objectContaining({
            failedAttempts: 3,
            maxAttempts: 3,
            thresholdReached: true,
          }),
        }),
      }),
    );
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_name: 'security.failed-login-threshold-reached',
          aggregate_type: 'users',
          aggregate_id: 'user-1',
          payload: expect.objectContaining({
            userId: 'user-1',
            failedAttempts: 3,
            maxAttempts: 3,
            reason: 'INVALID_PASSWORD',
          }),
        }),
      }),
    );
  });

  it('falls back to env threshold when persistent config is unavailable', async () => {
    compareMock.mockResolvedValueOnce(false);
    prisma.$queryRaw.mockResolvedValueOnce([]);
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        failed_login_attempts: 4,
        last_failed_login_at: new Date(),
      }),
    );

    await expect(
      service.login(
        { username: '12345678', password: 'bad-pass' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          new_values: expect.objectContaining({
            failedAttempts: 5,
            maxAttempts: 5,
          }),
        }),
      }),
    );
  });

  it('rejects logins for accounts currently locked', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        failed_login_attempts: 5,
        last_failed_login_at: new Date(),
        locked_until: new Date(Date.now() + 60_000),
      }),
    );

    await expect(
      service.login(
        { username: '12345678', password: 'secret' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(compareMock).not.toHaveBeenCalled();
  });

  it('rejects expired passwords using password_policy_days from system_config', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
      failed_login_max_attempts: 5,
      password_policy_days: 30,
      password_expiry_warning_days: 5,
      },
    ]);
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        password_changed_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      }),
    );

    await expect(
      service.login(
        { username: '12345678', password: 'secret' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toThrow(
      'La contraseña expiró. Solicita un restablecimiento para volver a ingresar.',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LOGIN_BLOCKED',
          new_values: expect.objectContaining({
            reason: 'PASSWORD_EXPIRED',
            security: expect.objectContaining({
              status: 'EXPIRED',
              policyDays: 30,
              warningDays: 5,
            }),
          }),
        }),
      }),
    );
  });

  it('consumes a dummy hash path for unknown users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login(
        { username: '87654321', password: 'secret' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(compareMock).toHaveBeenCalledWith('secret', DUMMY_PASSWORD_HASH);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LOGIN_FAILED',
          new_values: expect.objectContaining({
            reason: 'UNKNOWN_USER',
            username: '87654321',
          }),
        }),
      }),
    );
  });
});
