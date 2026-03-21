import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      return true; // Let JwtAuthGuard handle it or public routes
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { active: true },
    });

    if (!dbUser || !dbUser.active) {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    return true;
  }
}
