import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCliseDieLinkDto } from './dto/rack.dto';

@Injectable()
export class RelationsService {
  constructor(private prisma: PrismaService) {}

  async linkCliseDie(dto: CreateCliseDieLinkDto) {
    const existing = await this.prisma.cliseDieLink.findUnique({
      where: {
        clise_id_die_id: {
          clise_id: dto.clise_id,
          die_id: dto.die_id,
        },
      },
    });

    if (existing) {
      if (existing.deleted_at === null) {
        throw new ConflictException('Link already exists');
      }
      // Reactivate if soft-deleted
      return this.prisma.cliseDieLink.update({
        where: { id: existing.id },
        data: { deleted_at: null },
      });
    }

    return this.prisma.cliseDieLink.create({
      data: dto,
    });
  }

  async unlinkCliseDie(cliseId: string, dieId: string) {
    const link = await this.prisma.cliseDieLink.findUnique({
      where: {
        clise_id_die_id: {
          clise_id: cliseId,
          die_id: dieId,
        },
      },
    });

    if (!link || link.deleted_at) {
      throw new NotFoundException('Link not found');
    }

    return this.prisma.cliseDieLink.update({
      where: { id: link.id },
      data: { deleted_at: new Date() },
    });
  }

  async getCliseDies(cliseId: string) {
    return this.prisma.cliseDieLink.findMany({
      where: { clise_id: cliseId, deleted_at: null },
      include: { die: true },
    });
  }

  async getDieClises(dieId: string) {
    return this.prisma.cliseDieLink.findMany({
      where: { die_id: dieId, deleted_at: null },
      include: { clise: true },
    });
  }
}
