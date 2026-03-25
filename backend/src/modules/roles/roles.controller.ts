import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles as RolesDecorator } from '../auth/decorators/roles.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RolesDecorator('ADMIN')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RolesDecorator('ADMIN')
  @ApiOperation({ summary: 'Get a specific role by ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }
}
