import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMachineDto, UpdateMachineDto } from './dto/machine.dto';
import { toFrontendMachine } from '../../common/utils/frontend-entity.util';
import { resolveProductionMachineProcess } from '../../common/utils/production-machine.util';

@Injectable()
export class MachinesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMachineDto) {
    const normalizedCode = this.normalizeRequiredText(
      dto.code,
      'El código de la máquina es obligatorio.',
    );
    const normalizedName = this.normalizeRequiredText(
      dto.name,
      'El nombre de la máquina es obligatorio.',
    );
    const existing = await this.prisma.machine.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(
        `Machine with code ${normalizedCode} already exists`,
      );
    }

    const area = await this.resolveAreaOrThrow(dto.area_id);
    const normalizedType = this.resolveMachineTypeForArea(area.name, area.code);
    const normalizedStatus = this.normalizeMachineStatus(dto.status) || 'ACTIVE';

    const created = await this.prisma.machine.create({
      data: {
        code: normalizedCode,
        name: normalizedName,
        area_id: dto.area_id,
        type: normalizedType,
        status: normalizedStatus,
        active: this.resolveMachineActiveFlag(normalizedStatus, dto.active),
      },
      include: {
        area: true,
      },
    });

    return toFrontendMachine(created);
  }

  async findAll() {
    let machines = await this.prisma.machine.findMany({
      where: { deleted_at: null },
      include: {
        area: true,
      },
    });

    machines = await this.repairLegacyAreaAssignments(machines);

    return machines.map((machine) => toFrontendMachine(machine));
  }

  async findOne(id: string) {
    let machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        area: true,
      },
    });

    if (!machine || machine.deleted_at) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    machine = await this.repairLegacyAreaAssignment(machine);
    return toFrontendMachine(machine);
  }

  async update(id: string, dto: UpdateMachineDto) {
    const currentMachine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        area: true,
      },
    });

    if (!currentMachine || currentMachine.deleted_at) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    const normalizedCode = dto.code
      ? this.normalizeRequiredText(
          dto.code,
          'El código de la máquina es obligatorio.',
        )
      : undefined;
    if (normalizedCode && normalizedCode !== currentMachine.code) {
      const existing = await this.prisma.machine.findUnique({
        where: { code: normalizedCode },
      });

      if (existing && existing.id !== id && !existing.deleted_at) {
        throw new ConflictException(
          `Machine with code ${normalizedCode} already exists`,
        );
      }
    }

    const targetArea = dto.area_id
      ? await this.resolveAreaOrThrow(dto.area_id)
      : currentMachine.area;
    const normalizedType = this.resolveMachineTypeForArea(
      targetArea?.name,
      targetArea?.code,
    );
    const normalizedStatus = this.normalizeMachineStatus(dto.status);

    const updated = await this.prisma.machine.update({
      where: { id },
      data: {
        ...dto,
        code: normalizedCode,
        name: dto.name
          ? this.normalizeRequiredText(
              dto.name,
              'El nombre de la máquina es obligatorio.',
            )
          : undefined,
        type: normalizedType,
        status: normalizedStatus,
        active:
          normalizedStatus !== undefined
            ? this.resolveMachineActiveFlag(normalizedStatus, dto.active)
            : dto.active,
      },
      include: {
        area: true,
      },
    });

    return toFrontendMachine(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const [printCount, diecutCount, rewindCount] = await Promise.all([
      this.prisma.printReport.count({
        where: { machine_id: id, deleted_at: null },
      }),
      this.prisma.diecutReport.count({
        where: { machine_id: id, deleted_at: null },
      }),
      this.prisma.rewindReport.count({
        where: { machine_id: id, deleted_at: null },
      }),
    ]);

    if (printCount > 0 || diecutCount > 0 || rewindCount > 0) {
      throw new ConflictException(
        `Cannot delete Machine with ID ${id} because it is referenced in production reports`,
      );
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        active: false,
      },
    });
  }

  private async resolveAreaOrThrow(areaId: string) {
    const area = await this.prisma.area.findUnique({
      where: { id: areaId },
    });

    if (!area || area.deleted_at || area.active === false) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    return area;
  }

  private resolveMachineTypeForArea(areaName?: string | null, areaCode?: string | null) {
    const resolved = resolveProductionMachineProcess(
      undefined,
      areaName,
      areaCode,
    );
    if (resolved) return resolved;

    throw new BadRequestException(
      'El área seleccionada no corresponde a un tipo de máquina soportado.',
    );
  }

  private normalizeRequiredText(
    value: string | null | undefined,
    errorMessage: string,
  ) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new BadRequestException(errorMessage);
    }

    return normalized;
  }

  private normalizeMachineStatus(value: string | null | undefined) {
    const normalized = String(value || '').trim().toUpperCase();

    if (!normalized) {
      return undefined;
    }

    if (normalized.includes('INACT')) return 'INACTIVE';
    if (normalized.includes('MAINT') || normalized.includes('MANTEN'))
      return 'MAINTENANCE';
    if (normalized.includes('NO_OPERATOR') || normalized.includes('SIN'))
      return 'NO_OPERATOR';
    if (normalized.includes('STOP') || normalized.includes('DETEN'))
      return 'STOPPED';
    if (normalized.includes('ACT')) return 'ACTIVE';

    throw new BadRequestException('Selecciona un estado de máquina válido.');
  }

  private resolveMachineActiveFlag(
    status: string | undefined,
    fallback?: boolean,
  ) {
    if (status === 'INACTIVE') {
      return false;
    }

    if (status) {
      return true;
    }

    return fallback ?? true;
  }

  private async repairLegacyAreaAssignments<
    T extends {
      id: string;
      area_id: string;
      name?: string | null;
      code?: string | null;
      type?: string | null;
      area?: {
        id?: string | null;
        name?: string | null;
        code?: string | null;
      } | null;
    },
  >(machines: T[]) {
    let changed = false;

    for (const machine of machines) {
      const repaired = await this.repairLegacyAreaAssignment(machine);
      if (repaired.area_id !== machine.area_id) {
        changed = true;
      }
    }

    if (!changed) {
      return machines;
    }

    const refreshedMachines = await this.prisma.machine.findMany({
      where: { deleted_at: null },
      include: {
        area: true,
      },
    });

    return refreshedMachines as unknown as T[];
  }

  private async repairLegacyAreaAssignment<
    T extends {
      id: string;
      area_id: string;
      name?: string | null;
      code?: string | null;
      type?: string | null;
      area?: {
        id?: string | null;
        name?: string | null;
        code?: string | null;
      } | null;
    },
  >(machine: T) {
    const desiredProcess = resolveProductionMachineProcess(
      machine.type,
      machine.name,
      machine.code,
    );
    const assignedProcess = resolveProductionMachineProcess(
      undefined,
      machine.area?.name,
      machine.area?.code,
    );

    if (!desiredProcess) {
      return machine;
    }

    const areas = await this.prisma.area.findMany({
      where: {
        deleted_at: null,
        active: true,
      },
    });
    const targetArea = areas.find(
      (area) =>
        resolveProductionMachineProcess(undefined, area.name, area.code) ===
        desiredProcess,
    );

    const shouldUpdateArea = Boolean(targetArea && targetArea.id !== machine.area_id);
    const shouldUpdateType = machine.type !== desiredProcess;

    if (!shouldUpdateArea && !shouldUpdateType) {
      return machine;
    }

    await this.prisma.machine.update({
      where: { id: machine.id },
      data: {
        area_id: shouldUpdateArea ? targetArea?.id : undefined,
        type: desiredProcess,
      },
    });

    return {
      ...machine,
      area_id: shouldUpdateArea ? targetArea?.id || machine.area_id : machine.area_id,
      type: desiredProcess,
      area: shouldUpdateArea ? targetArea || machine.area : machine.area,
    };
  }
}
