import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftDto) {
    const existing = await this.prisma.shift.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Shift with code ${dto.code} already exists`);
    }

    return this.prisma.shift.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.shift.findMany({
      where: { deleted_at: null },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.deleted_at) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return shift;
  }

  async update(id: string, dto: UpdateShiftDto) {
    await this.findOne(id);
    return this.prisma.shift.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.shift.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        active: false,
      },
    });
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
}
