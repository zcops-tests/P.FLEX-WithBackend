import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { toFrontendUser } from '../../common/utils/frontend-entity.util';
import { assertValidDni, normalizeDni } from '../../common/utils/dni.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const normalizedUsername = assertValidDni(
      dto.username,
      'El username principal',
    );
    const role = await this.getRoleOrThrow(dto.role_id);
    const passwordHash = await this.resolvePasswordHashForCreate(
      role.code,
      dto.password,
      normalizedUsername,
    );
    const existing = await this.prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existing) {
      if (existing.deleted_at) {
        await this.hardDeleteUser(
          existing.id,
          `No se pudo reutilizar el DNI ${normalizedUsername} porque el usuario eliminado aún tiene historial asociado. Inactívelo en lugar de eliminarlo.`,
        );
      } else {
        throw new ConflictException(
          `Username ${normalizedUsername} already exists`,
        );
      }
    }

    const created = await this.prisma.user.create({
      data: {
        username: normalizedUsername,
        password_hash: passwordHash,
        name: dto.name,
        role_id: dto.role_id,
        active: dto.active ?? true,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        assignedAreas: {
          where: { deleted_at: null },
          include: {
            area: true,
          },
        },
      },
    });

    return toFrontendUser(created);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deleted_at: null },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        assignedAreas: {
          where: { deleted_at: null },
          include: {
            area: true,
          },
        },
      },
    });

    return users.map((user) => toFrontendUser(user));
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
    return toFrontendUser(result);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    const existingUser = await this.getUserEntityOrThrow(id);
    const nextUsername = dto.username
      ? assertValidDni(dto.username, 'El username principal')
      : undefined;
    const nextRole = dto.role_id
      ? await this.getRoleOrThrow(dto.role_id)
      : existingUser.role;

    if (nextUsername && nextUsername !== user.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: nextUsername },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Username ${nextUsername} already exists`);
      }
    }

    const data: any = {
      username: nextUsername,
      name: dto.name,
      role_id: dto.role_id,
      active: dto.active,
    };

    if (this.isOperatorRole(nextRole.code)) {
      if (!this.isOperatorRole(existingUser.role?.code) || dto.password) {
        data.password_hash = await this.buildDisabledOperatorPasswordHash(
          nextUsername || existingUser.username,
        );
      }
    } else if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
    } else if (this.isOperatorRole(existingUser.role?.code)) {
      throw new BadRequestException(
        'Debe definir una contraseña al convertir un operario en un usuario con acceso de inicio de sesion.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        assignedAreas: {
          where: { deleted_at: null },
          include: {
            area: true,
          },
        },
      },
    });

    return toFrontendUser(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.hardDeleteUser(
      id,
      'No se puede eliminar el usuario porque tiene historial asociado. Inactívelo en lugar de eliminarlo.',
    );
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

  async identifyOperatorByDni(dni: string) {
    const normalizedDni = assertValidDni(dni);

    const operator = await this.prisma.user.findFirst({
      where: {
        username: normalizedDni,
        active: true,
        deleted_at: null,
        role: {
          code: 'OPERATOR',
          active: true,
          deleted_at: null,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        assignedAreas: {
          where: { deleted_at: null },
          include: {
            area: true,
          },
        },
      },
    });

    if (!operator) {
      throw new NotFoundException(
        `No se encontro un operario activo para el DNI ${normalizedDni}`,
      );
    }

    const assignedAreas = (operator.assignedAreas || []).filter(
      (item: any) =>
        item.area && item.area.active !== false && !item.area.deleted_at,
    );

    if (!assignedAreas.length) {
      throw new ForbiddenException(
        'El operario no tiene areas asignadas y no puede usar el terminal.',
      );
    }

    return toFrontendUser({
      ...operator,
      username: normalizeDni(operator.username),
      assignedAreas,
    });
  }

  private async getRoleOrThrow(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.deleted_at || role.active === false) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return role;
  }

  private async getUserEntityOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  private async resolvePasswordHashForCreate(
    roleCode: string | null | undefined,
    password: string | undefined,
    username: string,
  ) {
    if (this.isOperatorRole(roleCode)) {
      return this.buildDisabledOperatorPasswordHash(username);
    }

    if (!String(password || '').trim()) {
      throw new BadRequestException(
        'Los usuarios con acceso de inicio de sesion requieren una contraseña.',
      );
    }

    return bcrypt.hash(password as string, 10);
  }

  private async buildDisabledOperatorPasswordHash(username: string) {
    return bcrypt.hash(`operator-disabled:${normalizeDni(username)}`, 10);
  }

  private isOperatorRole(roleCode: string | null | undefined) {
    return String(roleCode || '').toUpperCase() === 'OPERATOR';
  }

  private async hardDeleteUser(
    userId: string,
    conflictMessage: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.refreshToken.deleteMany({
          where: { user_id: userId },
        });
        await tx.userAssignedArea.deleteMany({
          where: { user_id: userId },
        });
        await tx.userSession.deleteMany({
          where: { user_id: userId },
        });

        return tx.user.delete({
          where: { id: userId },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        throw new ConflictException(conflictMessage);
      }

      throw error;
    }
  }
}
