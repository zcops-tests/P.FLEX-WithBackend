import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('admin.roles.manage')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('admin.roles.manage')
  @ApiOperation({ summary: 'Get a specific role by ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('admin.roles.manage')
  @ApiOperation({ summary: 'Create a custom role' })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @Permissions('admin.roles.manage')
  @ApiOperation({ summary: 'Update an existing role' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('admin.roles.manage')
  @ApiOperation({ summary: 'Soft-delete an existing role' })
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
