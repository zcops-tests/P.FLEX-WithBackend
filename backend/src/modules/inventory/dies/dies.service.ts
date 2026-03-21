import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDieDto, UpdateDieDto } from './dto/die.dto';

@Injectable()
export class DiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDieDto) {
    const existing = await this.prisma.die.findUnique({
      where: { serie: dto.serie },
    });
    if (existing) {
      throw new ConflictException(`Die with serie ${dto.serie} already exists`);
    }

    return this.prisma.die.create({
      data: {
        ...dto,
        metros_acumulados: 0,
      },
    });
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    q?: string;
  }) {
    const { page = 1, pageSize = 20, q } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deleted_at: null,
    };

    if (q) {
      where.OR = [
        { serie: { contains: q } },
        { medida: { contains: q } },
        { cliente: { contains: q } },
        { material: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.die.count({ where }),
      this.prisma.die.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const die = await this.prisma.die.findUnique({
      where: { id },
      include: {
        clise_links: {
          include: {
            clise: true,
          },
        },
        history: true,
      },
    });

    if (!die || die.deleted_at) {
      throw new NotFoundException(`Die with ID ${id} not found`);
    }
    return die;
  }

  async update(id: string, dto: UpdateDieDto) {
    await this.findOne(id);
    return this.prisma.die.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if used in active diecut reports
    const activeRefs = await this.prisma.diecutReport.count({
      where: { die_id: id },
    });

    if (activeRefs > 0) {
      throw new ConflictException(`Cannot delete Die with ID ${id} because it is referenced by active production reports`);
    }

    return this.prisma.die.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
