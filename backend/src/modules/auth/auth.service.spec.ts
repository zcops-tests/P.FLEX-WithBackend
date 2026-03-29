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
  role: {
    ...defaultRole,
    ...overrides.role,
    permissions: overrides.role?.permissions ?? defaultRole.permissions,
  },
  ...overrides,
});

describe('AuthService', () => {
  type UserUpdateCall = {
    where: { id: string };
    data: {
      failed_login_attempts?: number;
      last_failed_login_at?: Date | null;
      locked_until?: Date | null;
      last_login_at?: Date | null;
    };
  };

  type AuditCreateCall = {
    data: {
      action: string;
      new_values?: {
        reason?: string;
        username?: string;
      };
    };
  };

  let service: AuthService;
  let prisma: PrismaServiceMock;
  let jwtService: JwtServiceMock;
  let configService: ConfigServiceMock;
  let compareMock: jest.Mock<Promise<boolean>, [string, string]>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations) => Promise.all(operations)),
      user: {
        findUnique: jest.fn<Promise<AuthUserRecord | null>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      userSession: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
        updateMany: jest.fn<Promise<unknown>, [unknown]>(),
        findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
      },
      refreshToken: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
        updateMany: jest.fn<Promise<unknown>, [unknown]>(),
        findFirst: jest.fn<
          Promise<{ id: string; token_hash: string; expires_at: Date } | null>,
          [unknown]
        >(),
      },
      auditLog: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
    };

    jwtService = {
      signAsync: jest.fn<Promise<string>, [object, object]>(),
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
    jwtService.signAsync.mockResolvedValue('signed-token');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should clear failed login state after a successful login', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        failed_login_attempts: 3,
        last_failed_login_at: new Date(),
      }),
    );

    await service.login(
      { username: '12345678', password: 'secret' },
      '127.0.0.1',
      'jest',
    );

    const userUpdateMock = prisma.user.update;
    const firstCall = userUpdateMock.mock.calls[0]?.[0] as
      | UserUpdateCall
      | undefined;

    expect(firstCall).toBeDefined();
    expect(firstCall?.where.id).toBe('user-1');
    expect(firstCall?.data.failed_login_attempts).toBe(0);
    expect(firstCall?.data.last_failed_login_at).toBeNull();
    expect(firstCall?.data.locked_until).toBeNull();
    expect(firstCall?.data.last_login_at).toBeInstanceOf(Date);
  });

  it('should lock the account after reaching the max failed attempts', async () => {
    compareMock.mockResolvedValueOnce(false);
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

    const userUpdateMock = prisma.user.update;
    const auditCreateMock = prisma.auditLog.create;
    const updateCall = userUpdateMock.mock.calls[0]?.[0] as
      | UserUpdateCall
      | undefined;
    const auditCall = auditCreateMock.mock.calls[0]?.[0] as
      | AuditCreateCall
      | undefined;

    expect(updateCall).toBeDefined();
    expect(updateCall?.where.id).toBe('user-1');
    expect(updateCall?.data.failed_login_attempts).toBe(5);
    expect(updateCall?.data.last_failed_login_at).toBeInstanceOf(Date);
    expect(updateCall?.data.locked_until).toBeInstanceOf(Date);

    expect(auditCall).toBeDefined();
    expect(auditCall?.data.action).toBe('LOGIN_LOCKED');
  });

  it('should reject logins for accounts currently locked', async () => {
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

  it('should consume a dummy hash path for unknown users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login(
        { username: '87654321', password: 'secret' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const auditCreateMock = prisma.auditLog.create;
    const auditCall = auditCreateMock.mock.calls[0]?.[0] as
      | AuditCreateCall
      | undefined;

    expect(compareMock).toHaveBeenCalledWith('secret', DUMMY_PASSWORD_HASH);
    expect(auditCall).toBeDefined();
    expect(auditCall?.data.action).toBe('LOGIN_FAILED');
    expect(auditCall?.data.new_values?.reason).toBe('UNKNOWN_USER');
    expect(auditCall?.data.new_values?.username).toBe('87654321');
  });
});
