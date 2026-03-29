import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toFrontendRole } from '../../common/utils/frontend-entity.util';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: { deleted_at: null },
      include: {
        permissions: {
          where: { deleted_at: null },
          include: {
            permission: true,
          },
        },
        users: {
          where: { deleted_at: null },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => toFrontendRole(role));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          where: { deleted_at: null },
          include: {
            permission: true,
          },
        },
        users: {
          where: { deleted_at: null },
          select: { id: true },
        },
      },
    });
    if (!role || role.deleted_at) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return toFrontendRole(role);
  }

  async create(dto: CreateRoleDto) {
    const code = await this.buildUniqueCode(dto.name);
    const permissionIds = await this.resolvePermissionIds(
      dto.permission_codes || [],
    );

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || dto.name.trim(),
          active: dto.active ?? true,
        },
      });

      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: created.id,
            permission_id: permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.role.findUnique({
        where: { id: created.id },
        include: {
          permissions: {
            where: { deleted_at: null },
            include: { permission: true },
          },
          users: {
            where: { deleted_at: null },
            select: { id: true },
          },
        },
      });
    });

    return toFrontendRole(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);
    const permissionIds = dto.permission_codes
      ? await this.resolvePermissionIds(dto.permission_codes)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          active: dto.active,
        },
      });

      if (permissionIds) {
        await tx.rolePermission.updateMany({
          where: { role_id: id, deleted_at: null },
          data: { deleted_at: new Date() },
        });

        for (const permissionId of permissionIds) {
          await tx.rolePermission.upsert({
            where: {
              role_id_permission_id: {
                role_id: id,
                permission_id: permissionId,
              },
            },
            update: {
              deleted_at: null,
            },
            create: {
              role_id: id,
              permission_id: permissionId,
            },
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          permissions: {
            where: { deleted_at: null },
            include: { permission: true },
          },
          users: {
            where: { deleted_at: null },
            select: { id: true },
          },
        },
      });
    });

    return toFrontendRole(updated);
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    if (role.assignedUserCount && role.assignedUserCount > 0) {
      throw new ConflictException(
        'No se puede eliminar un rol con usuarios asignados.',
      );
    }

    if (!String(role.code || '').startsWith('CUSTOM_')) {
      throw new ConflictException(
        'No se puede eliminar un rol predefinido del sistema.',
      );
    }

    await this.prisma.rolePermission.updateMany({
      where: { role_id: id, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    await this.prisma.role.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        active: false,
      },
    });

    return { success: true };
  }

  private async resolvePermissionIds(permissionCodes: string[]) {
    const normalizedCodes = [
      ...new Set(
        permissionCodes
          .map((code) => String(code || '').trim())
          .filter(Boolean),
      ),
    ];
    if (!normalizedCodes.length) return [];

    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: normalizedCodes },
        deleted_at: null,
      },
      select: { id: true, code: true },
    });

    if (permissions.length !== normalizedCodes.length) {
      const foundCodes = new Set(
        permissions.map((permission) => permission.code),
      );
      const missing = normalizedCodes.filter((code) => !foundCodes.has(code));
      throw new NotFoundException(
        `Permissions not found: ${missing.join(', ')}`,
      );
    }

    return permissions.map((permission) => permission.id);
  }

  private async buildUniqueCode(name: string) {
    const base = `CUSTOM_${
      String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase() || 'ROLE'
    }`;

    let candidate = base;
    let suffix = 1;

    while (await this.prisma.role.findUnique({ where: { code: candidate } })) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
