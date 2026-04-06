import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserStatusGuard } from './user-status.guard';

describe('UserStatusGuard', () => {
  let guard: UserStatusGuard;
  let prisma: {
    user: { findUnique: jest.Mock };
    systemConfig: { findFirst: jest.Mock };
  };

  function createContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      systemConfig: {
        findFirst: jest.fn().mockResolvedValue({
          password_policy_days: 90,
        }),
      },
    };

    guard = new UserStatusGuard(prisma as unknown as PrismaService);
  });

  it('allows active users with non-expired passwords', async () => {
    prisma.user.findUnique.mockResolvedValue({
      active: true,
      password_changed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      role: { code: 'SUPERVISOR' },
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('blocks inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      active: false,
      password_changed_at: null,
      created_at: new Date(),
      role: { code: 'SUPERVISOR' },
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks expired passwords for non-operator users', async () => {
    prisma.systemConfig.findFirst.mockResolvedValue({
      password_policy_days: 30,
    });
    prisma.user.findUnique.mockResolvedValue({
      active: true,
      password_changed_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      role: { code: 'SUPERVISOR' },
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).rejects.toThrow(
      'La contraseña expiró. Solicita un restablecimiento para volver a ingresar.',
    );
  });

  it('skips password expiry enforcement for operator users', async () => {
    prisma.systemConfig.findFirst.mockResolvedValue({
      password_policy_days: 1,
    });
    prisma.user.findUnique.mockResolvedValue({
      active: true,
      password_changed_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      role: { code: 'OPERATOR' },
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });
});
