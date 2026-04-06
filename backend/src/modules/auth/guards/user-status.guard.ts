import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedRequest } from '../auth.types';

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const userId = user?.sub || user?.id;

    if (!user || !userId) {
      return true; // Let JwtAuthGuard handle it or public routes
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        active: true,
        password_changed_at: true,
        created_at: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.active) {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    const roleCode = String(dbUser.role?.code || '').toUpperCase();
    if (roleCode !== 'OPERATOR') {
      const rows = await this.prisma.$queryRaw<
        Array<{ password_policy_days: number | null }>
      >(Prisma.sql`
        SELECT password_policy_days
        FROM system_config
        ORDER BY updated_at DESC
        LIMIT 1
      `);
      const config = rows[0] ?? null;
      const policyDays = Math.max(
        1,
        Number(config?.password_policy_days || 90),
      );
      const baseDate = dbUser.password_changed_at || dbUser.created_at;
      const expiresAt = new Date(
        baseDate.getTime() + policyDays * 24 * 60 * 60 * 1000,
      );

      if (expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException(
          'La contraseña expiró. Solicita un restablecimiento para volver a ingresar.',
        );
      }
    }

    return true;
  }
}
