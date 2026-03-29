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
    const userId = user?.sub || user?.id;
    const permissionCodes = Array.isArray(user?.permissionCodes)
      ? user.permissionCodes
      : [];
    const requestPath = String(request?.path || request?.originalUrl || '');

    if (!user || !userId) {
      return false;
    }

    // Skip contextual checks for ADMIN role if desired, but let's be strict for now
    if (
      user.roleCode === 'ADMIN' ||
      user.role === 'Sistemas' ||
      user.role === 'ADMIN'
    ) {
      return true;
    }

    // 1. Check assigned areas for the user
    const userAreas = await this.prisma.userAssignedArea.findMany({
      where: { user_id: userId },
      select: { area_id: true },
    });
    const areaIds = userAreas.map((ua) => ua.area_id);

    // 2. Machine validation (if request targets a specific machine)
    const machineId =
      body?.machine_id ||
      body?.machineId ||
      query?.machine_id ||
      query?.machineId ||
      params?.machine_id ||
      params?.machineId;
    if (machineId) {
      const machine = await this.prisma.machine.findUnique({
        where: { id: machineId },
        include: { area: true },
      });

      if (!machine) {
        throw new ForbiddenException('Machine not found');
      }

      if (!areaIds.includes(machine.area_id)) {
        const delegatedOperatorId =
          body?.operator_id ||
          body?.operatorId ||
          params?.operator_id ||
          params?.operatorId;

        const canDelegateForOperator =
          permissionCodes.includes('operator.host') && delegatedOperatorId;
        if (canDelegateForOperator) {
          if (
            await this.operatorMatchesProcessArea(
              delegatedOperatorId,
              requestPath,
              machine.area_id,
              [machine.area?.name, machine.area?.code, machine.type],
            )
          ) {
            return true;
          }
        }

        this.logger.warn(
          `User ${userId} attempted to access machine ${machineId} outside assigned areas`,
        );
        throw new ForbiddenException('User not assigned to this machine area');
      }
    }

    const delegatedOperatorId =
      body?.operator_id ||
      body?.operatorId ||
      params?.operator_id ||
      params?.operatorId;

    if (
      !machineId &&
      delegatedOperatorId &&
      permissionCodes.includes('operator.host')
    ) {
      const processAliases = this.getProcessAliases(requestPath);
      if (processAliases.length) {
        const operatorMatches = await this.operatorMatchesProcessArea(
          delegatedOperatorId,
          requestPath,
        );
        if (!operatorMatches) {
          this.logger.warn(
            `Host ${userId} attempted to create report outside delegated operator process scope`,
          );
          throw new ForbiddenException(
            'Delegated operator is not assigned to this process',
          );
        }
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
        throw new ForbiddenException(
          `This operation requires a device with profile: ${requiredProfile}`,
        );
      }
    }

    return true;
  }

  private async operatorMatchesProcessArea(
    operatorId: string,
    requestPath: string,
    expectedAreaId?: string | null,
    contextLabels: Array<string | null | undefined> = [],
  ) {
    const assignments = await this.prisma.userAssignedArea.findMany({
      where: { user_id: operatorId },
      select: {
        area_id: true,
        area: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (
      expectedAreaId &&
      assignments.some((assignment) => assignment.area_id === expectedAreaId)
    ) {
      return true;
    }

    const aliases = this.getProcessAliases(requestPath);
    const assignmentTokens = assignments.flatMap((assignment) =>
      [assignment.area?.name, assignment.area?.code]
        .map((value) => this.normalizeToken(value))
        .filter(Boolean),
    );

    const contextTokens = contextLabels
      .map((value) => this.normalizeToken(value))
      .filter(Boolean);

    const comparisonTokens = [...aliases, ...contextTokens];
    if (!comparisonTokens.length || !assignmentTokens.length) {
      return false;
    }

    return assignmentTokens.some((token) =>
      comparisonTokens.some(
        (alias) => token.includes(alias) || alias.includes(token),
      ),
    );
  }

  private getProcessAliases(path: string) {
    const normalized = this.normalizeToken(path);
    if (normalized.includes('PRINT')) return ['IMPRESION', 'IMPRENTA', 'PRINT'];
    if (normalized.includes('DIECUT') || normalized.includes('TROQ'))
      return ['TROQUELADO', 'DIECUT'];
    if (normalized.includes('REWIND') || normalized.includes('REBOB'))
      return ['REBOBINADO', 'REWIND', 'ACABADO', 'FINISH'];
    if (normalized.includes('PACK'))
      return ['EMPAQUETADO', 'PACKAGING', 'PACK', 'ACABADO', 'FINISH'];
    return [];
  }

  private normalizeToken(value: string | null | undefined) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }
}
