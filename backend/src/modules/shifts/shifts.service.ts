import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { toFrontendShift } from '../../common/utils/frontend-entity.util';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftDto) {
    this.assertContractShiftCode(dto.code);

    const existing = await this.prisma.shift.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Shift with code ${dto.code} already exists`);
    }

    const shift = await this.prisma.shift.create({
      data: dto,
    });

    return toFrontendShift(shift);
  }

  async findAll() {
    const shifts = await this.prisma.shift.findMany({
      where: {
        deleted_at: null,
        active: true,
        code: { in: ['T1', 'T2'] },
      },
      orderBy: { code: 'asc' },
    });

    return shifts.map((shift) => toFrontendShift(shift));
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.deleted_at) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return toFrontendShift(shift);
  }

  async update(id: string, dto: UpdateShiftDto) {
    const existing = await this.findOne(id);
    this.assertContractShiftCode(existing.code);

    const shift = await this.prisma.shift.update({
      where: { id },
      data: dto,
    });

    return toFrontendShift(shift);
  }

  async remove(id: string) {
    const shift = await this.findOne(id);
    this.assertContractShiftCode(shift.code);
    throw new ConflictException(
      'La configuración vigente requiere mantener exactamente los turnos T1 y T2 activos.',
    );
  }

  async getCurrentShift(targetTime: Date = new Date()) {
    const shifts = await this.findAll();

    // Get time in HH:mm:ss format for comparison
    const hours = targetTime.getUTCHours().toString().padStart(2, '0');
    const minutes = targetTime.getUTCMinutes().toString().padStart(2, '0');
    const seconds = targetTime.getUTCSeconds().toString().padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}:${seconds}`;

    for (const shift of shifts) {
      const start = shift.start_time; // These are strings like "06:00:00" from DB
      const end = shift.end_time;

      if (shift.crosses_midnight) {
        // Example: 22:00 to 06:00
        if (currentTimeStr >= start || currentTimeStr < end) {
          return shift;
        }
      } else {
        // Example: 06:00 to 14:00
        if (currentTimeStr >= start && currentTimeStr < end) {
          return shift;
        }
      }
    }

    return null; // No shift found (should not happen in 24/7)
  }

  private assertContractShiftCode(code: string) {
    const normalized = String(code || '').trim().toUpperCase();
    if (normalized === 'T1' || normalized === 'T2') {
      return;
    }

    throw new ConflictException(
      'La configuración vigente solo permite los turnos T1 y T2.',
    );
  }
}
