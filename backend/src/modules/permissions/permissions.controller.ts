import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('admin.permissions.view')
  @ApiOperation({ summary: 'Get all system permissions' })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Permissions('admin.permissions.view')
  @ApiOperation({ summary: 'Get a specific permission by ID' })
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }
}
