import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAreaDto, UpdateAreaDto } from './dto/area.dto';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAreaDto) {
    const existing = await this.prisma.area.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Area with code ${dto.code} already exists`);
    }

    return this.prisma.area.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.area.findMany({
      where: { deleted_at: null },
    });
  }

  async findOne(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
    });
    if (!area || area.deleted_at) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return area;
  }

  async update(id: string, dto: UpdateAreaDto) {
    await this.findOne(id);
    return this.prisma.area.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const area = await this.findOne(id);
    // Soft delete is handled by the Prisma extension if we use delete(), 
    // but we can also do it explicitly
    return this.prisma.area.update({
      where: { id },
      data: { deleted_at: new Date(), active: false },
    });
  }
}
