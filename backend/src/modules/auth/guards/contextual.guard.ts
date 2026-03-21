import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ContextualGuard implements CanActivate {
  private readonly logger = new Logger(ContextualGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user, body, query, params, headers } = request;

    if (!user || !user.id) {
      return false;
    }

    // Skip contextual checks for ADMIN role if desired, but let's be strict for now
    if (user.role === 'ADMIN') {
      return true;
    }

    // 1. Check assigned areas for the user
    const userAreas = await this.prisma.userAssignedArea.findMany({
      where: { user_id: user.id },
      select: { area_id: true },
    });
    const areaIds = userAreas.map((ua) => ua.area_id);

    // 2. Machine validation (if request targets a specific machine)
    const machineId = body?.machineId || query?.machineId || params?.machineId;
    if (machineId) {
      const machine = await this.prisma.machine.findUnique({
        where: { id: machineId },
      });

      if (!machine) {
        throw new ForbiddenException('Machine not found');
      }

      if (!areaIds.includes(machine.area_id)) {
        this.logger.warn(`User ${user.id} attempted to access machine ${machineId} outside assigned areas`);
        throw new ForbiddenException('User not assigned to this machine area');
      }
    }

    // 3. Device Profile validation (if required by the endpoint)
    // This could also be a separate guard or checked here
    const requiredProfile = this.reflector.get<string>(
      'deviceProfile',
      context.getHandler(),
    );
    if (requiredProfile) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: user.sid },
      });

      if (!session || session.device_profile !== requiredProfile) {
        throw new ForbiddenException(`This operation requires a device with profile: ${requiredProfile}`);
      }
    }

    return true;
  }
}
