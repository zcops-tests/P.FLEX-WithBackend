import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateRackConfigDto, UpdateRackConfigDto } from './dto/rack.dto';

@Injectable()
export class RacksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRackConfigDto) {
    const existing = await this.prisma.rackConfig.findFirst({
      where: { name: dto.name, deleted_at: null },
    });
    if (existing) {
      throw new ConflictException(`Rack with name ${dto.name} already exists`);
    }

    return this.prisma.rackConfig.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.rackConfig.findMany({
      where: { deleted_at: null },
    });
  }

  async findOne(id: string) {
    const rack = await this.prisma.rackConfig.findUnique({
      where: { id },
    });

    if (!rack || rack.deleted_at) {
      throw new NotFoundException(`Rack with ID ${id} not found`);
    }
    return rack;
  }

  async update(id: string, dto: UpdateRackConfigDto) {
    await this.findOne(id);
    return this.prisma.rackConfig.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if any Clise or Die is stored in this rack
    const [cliseCount, dieCount] = await Promise.all([
      this.prisma.clise.count({ where: { rack_id: id, deleted_at: null } }),
      this.prisma.die.count({ where: { rack_id: id, deleted_at: null } }),
    ]);

    if (cliseCount > 0 || dieCount > 0) {
      throw new ConflictException(`Cannot delete Rack with ID ${id} because it still contains active items`);
    }

    return this.prisma.rackConfig.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        active: false,
      },
    });
  }
}
