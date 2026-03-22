import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDieDto, UpdateDieDto } from './dto/die.dto';
import { DieQueryDto } from './dto/die-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../../common/utils/pagination.util';
import { toFrontendDie } from '../../../common/utils/frontend-entity.util';

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

    const created = await this.prisma.die.create({
      data: {
        ...dto,
        metros_acumulados: 0,
      },
    });

    return toFrontendDie(created);
  }

  async findAll(params: DieQueryDto) {
    const { q } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.DieWhereInput = {
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
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        include: {
          clise_links: {
            include: {
              clise: true,
            },
          },
          history: {
            include: {
              user: true,
              machine: true,
            },
          },
        },
      }),
    ]);

    return buildPaginatedResult(items.map((item) => toFrontendDie(item)), total, pagination);
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
        history: {
          include: {
            user: true,
            machine: true,
          },
        },
      },
    });

    if (!die || die.deleted_at) {
      throw new NotFoundException(`Die with ID ${id} not found`);
    }
    return toFrontendDie(die);
  }

  async update(id: string, dto: UpdateDieDto) {
    await this.findOne(id);
    const updated = await this.prisma.die.update({
      where: { id },
      data: dto,
      include: {
        clise_links: {
          include: {
            clise: true,
          },
        },
        history: {
          include: {
            user: true,
            machine: true,
          },
        },
      },
    });

    return toFrontendDie(updated);
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
