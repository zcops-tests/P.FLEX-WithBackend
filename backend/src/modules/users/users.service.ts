import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException(`Username ${dto.username} already exists`);
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    return this.prisma.user.create({
      data: {
        username: dto.username,
        password_hash: passwordHash || '',
        name: dto.name,
        role_id: dto.role_id,
        active: dto.active ?? true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role_id: true,
        active: true,
        created_at: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        username: true,
        name: true,
        role_id: true,
        active: true,
        created_at: true,
        role: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        assignedAreas: {
          include: {
            area: true,
          },
        },
      },
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    const data: any = {
      name: dto.name,
      role_id: dto.role_id,
      active: dto.active,
    };

    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role_id: true,
        active: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        active: false,
      },
    });
  }

  async assignArea(userId: string, areaId: string) {
    await this.findOne(userId);
    const area = await this.prisma.area.findUnique({ where: { id: areaId } });
    if (!area || area.deleted_at) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    return this.prisma.userAssignedArea.upsert({
      where: {
        user_id_area_id: {
          user_id: userId,
          area_id: areaId,
        },
      },
      update: {},
      create: {
        user_id: userId,
        area_id: areaId,
      },
    });
  }

  async unassignArea(userId: string, areaId: string) {
    try {
      return await this.prisma.userAssignedArea.delete({
        where: {
          user_id_area_id: {
            user_id: userId,
            area_id: areaId,
          },
        },
      });
    } catch (e) {
      // Ignore if doesn't exist
      return null;
    }
  }
}
