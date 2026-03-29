import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAreaDto, UpdateAreaDto } from './dto/area.dto';
import { toFrontendArea } from '../../common/utils/frontend-entity.util';
import { DEFAULT_PRODUCTION_AREAS } from './default-production-areas';

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

    const area = await this.prisma.area.create({
      data: dto,
    });

    return toFrontendArea(area);
  }

  async findAll() {
    await this.ensureDefaultProductionAreas();

    const areas = await this.prisma.area.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    });

    return areas.map((area) => toFrontendArea(area));
  }

  async findOne(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
    });
    if (!area || area.deleted_at) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return toFrontendArea(area);
  }

  async update(id: string, dto: UpdateAreaDto) {
    await this.findOne(id);
    const area = await this.prisma.area.update({
      where: { id },
      data: dto,
    });

    return toFrontendArea(area);
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

  private async ensureDefaultProductionAreas() {
    await Promise.all(
      DEFAULT_PRODUCTION_AREAS.map((area) =>
        this.prisma.area.upsert({
          where: { code: area.code },
          update: {
            name: area.name,
            active: true,
            deleted_at: null,
          },
          create: {
            code: area.code,
            name: area.name,
            active: true,
          },
        }),
      ),
    );
  }
}
