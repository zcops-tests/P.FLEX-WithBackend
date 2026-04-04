import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  UpdateSystemConfigContractDto,
  UpdateSystemConfigContractShiftDto,
  UpdateSystemConfigDto,
} from './dto/system-config.dto';
import {
  toFrontendShift,
  toFrontendSystemConfig,
} from '../../common/utils/frontend-entity.util';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const config = await this.findOrCreateConfig();
    return toFrontendSystemConfig(config);
  }

  async update(dto: UpdateSystemConfigDto) {
    const existing = await this.findOrCreateConfig();

    const updated = await this.prisma.systemConfig.update({
      where: { id: existing.id },
      data: dto,
    });

    return toFrontendSystemConfig(updated);
  }

  async getPlantName(): Promise<string> {
    const config = await this.get();
    return config.plantName || config.plant_name;
  }

  async getContract() {
    const [config, shifts, recentAudit] = await Promise.all([
      this.findOrCreateConfig(),
      this.ensureBaselineShifts(),
      this.prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    return {
      system_config: toFrontendSystemConfig(config),
      shifts: shifts.map((shift) => toFrontendShift(shift)),
      audit_preview: recentAudit,
    };
  }

  async updateContract(dto: UpdateSystemConfigContractDto) {
    const existing = await this.findOrCreateConfig();
    const normalizedShifts = this.normalizeContractShifts(dto.shifts);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedConfig = await tx.systemConfig.update({
        where: { id: existing.id },
        data: dto.system_config,
      });

      const savedShifts = [] as Awaited<ReturnType<typeof tx.shift.upsert>>[];
      for (const shift of normalizedShifts) {
        const savedShift = await tx.shift.upsert({
          where: { code: shift.code },
          update: {
            name: shift.name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            crosses_midnight: shift.crosses_midnight,
            active: shift.active,
            deleted_at: null,
          },
          create: {
            code: shift.code,
            name: shift.name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            crosses_midnight: shift.crosses_midnight,
            active: shift.active,
          },
        });
        savedShifts.push(savedShift);
      }

      await tx.shift.updateMany({
        where: {
          code: { notIn: normalizedShifts.map((shift) => shift.code) },
          deleted_at: null,
        },
        data: {
          active: false,
        },
      });

      return { updatedConfig, savedShifts };
    });

    return {
      system_config: toFrontendSystemConfig(result.updatedConfig),
      shifts: result.savedShifts.map((shift) => toFrontendShift(shift)),
      audit_preview: [],
    };
  }

  private async findOrCreateConfig() {
    const config = await this.prisma.systemConfig.findFirst();
    if (config) {
      return config;
    }

    return this.prisma.systemConfig.create({
      data: {
        plant_name: 'P.FLEX-SYSTEM',
      },
    });
  }

  private async ensureBaselineShifts() {
    const baseline = [
      {
        code: 'T1',
        name: 'Turno 1',
        start_time: '06:00:00',
        end_time: '14:00:00',
        crosses_midnight: false,
      },
      {
        code: 'T2',
        name: 'Turno 2',
        start_time: '14:00:00',
        end_time: '22:00:00',
        crosses_midnight: false,
      },
    ] as const;

    const existingShifts = await this.prisma.shift.findMany({
      where: {
        code: { in: baseline.map((shift) => shift.code) },
      },
    });

    const existingByCode = new Map(
      existingShifts.map((shift) => [shift.code, shift]),
    );

    const ensured = [] as Awaited<ReturnType<typeof this.prisma.shift.upsert>>[];
    for (const shift of baseline) {
      const existing = existingByCode.get(shift.code);
      ensured.push(
        await this.prisma.shift.upsert({
          where: { code: shift.code },
          update: {
            name: existing?.name || shift.name,
            start_time: existing?.start_time || shift.start_time,
            end_time: existing?.end_time || shift.end_time,
            crosses_midnight:
              existing?.crosses_midnight ?? shift.crosses_midnight,
            active: true,
            deleted_at: null,
          },
          create: {
            ...shift,
            active: true,
          },
        }),
      );
    }

    return ensured.sort((left, right) => left.code.localeCompare(right.code));
  }

  private normalizeContractShifts(shifts: UpdateSystemConfigContractShiftDto[]) {
    const byCode = new Map(
      shifts.map((shift) => [
        shift.code.trim().toUpperCase(),
        {
          code: shift.code.trim().toUpperCase(),
          name: shift.name.trim(),
          start_time: this.normalizeShiftTime(shift.start_time),
          end_time: this.normalizeShiftTime(shift.end_time),
          crosses_midnight: Boolean(shift.crosses_midnight),
          active: shift.active !== false,
        },
      ]),
    );

    const orderedCodes = ['T1', 'T2'];
    const normalized = orderedCodes.map((code) => {
      const shift = byCode.get(code);
      if (!shift) {
        throw new NotFoundException(
          `El contrato de configuración requiere el turno ${code}.`,
        );
      }

      return shift;
    });

    return normalized;
  }

  private normalizeShiftTime(value: string) {
    const normalized = String(value || '').trim();
    if (/^\d{2}:\d{2}$/.test(normalized)) {
      return `${normalized}:00`;
    }

    return normalized;
  }
}
