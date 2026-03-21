import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCliseDto, UpdateCliseDto } from './dto/clise.dto';

@Injectable()
export class ClisesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCliseDto) {
    const existing = await this.prisma.clise.findUnique({
      where: { item_code: dto.item_code },
    });
    if (existing) {
      throw new ConflictException(`Clisé with item code ${dto.item_code} already exists`);
    }

    return this.prisma.clise.create({
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
        { item_code: { contains: q } },
        { descripcion: { contains: q } },
        { cliente: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.clise.count({ where }),
      this.prisma.clise.findMany({
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
    const clise = await this.prisma.clise.findUnique({
      where: { id },
      include: {
        color_usage: true,
        die_links: {
          include: {
            die: true,
          },
        },
        history: true,
      },
    });

    if (!clise || clise.deleted_at) {
      throw new NotFoundException(`Clisé with ID ${id} not found`);
    }
    return clise;
  }

  async update(id: string, dto: UpdateCliseDto) {
    await this.findOne(id);
    return this.prisma.clise.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    // Check if used in active print reports or work orders
    const activeRefs = await this.prisma.printReport.count({
      where: { clise_id: id },
    });

    if (activeRefs > 0) {
      throw new ConflictException(`Cannot delete Clisé with ID ${id} because it is referenced by active production reports`);
    }

    return this.prisma.clise.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
