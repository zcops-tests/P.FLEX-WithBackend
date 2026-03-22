import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMachineDto, UpdateMachineDto } from './dto/machine.dto';
import { toFrontendMachine } from '../../common/utils/frontend-entity.util';

@Injectable()
export class MachinesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMachineDto) {
    const existing = await this.prisma.machine.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Machine with code ${dto.code} already exists`);
    }

    const created = await this.prisma.machine.create({
      data: {
        code: dto.code,
        name: dto.name,
        area_id: dto.area_id,
        type: dto.type,
        active: dto.active ?? true,
      },
      include: {
        area: true,
      },
    });

    return toFrontendMachine(created);
  }

  async findAll() {
    const machines = await this.prisma.machine.findMany({
      where: { deleted_at: null },
      include: {
        area: true,
      },
    });

    return machines.map((machine) => toFrontendMachine(machine));
  }

  async findOne(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        area: true,
      },
    });

    if (!machine || machine.deleted_at) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    return toFrontendMachine(machine);
  }

  async update(id: string, dto: UpdateMachineDto) {
    await this.findOne(id);
    const updated = await this.prisma.machine.update({
      where: { id },
      data: dto,
      include: {
        area: true,
      },
    });

    return toFrontendMachine(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const [printCount, diecutCount] = await Promise.all([
      this.prisma.printReport.count({ where: { machine_id: id, deleted_at: null } }),
      this.prisma.diecutReport.count({ where: { machine_id: id, deleted_at: null } }),
    ]);

    if (printCount > 0 || diecutCount > 0) {
      throw new ConflictException(`Cannot delete Machine with ID ${id} because it is referenced in production reports`);
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        active: false,
      },
    });
  }
}
