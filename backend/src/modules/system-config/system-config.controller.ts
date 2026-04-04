import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import {
  UpdateSystemConfigContractDto,
  UpdateSystemConfigDto,
} from './dto/system-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('System Configuration')
@Controller('system-config')
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current system configuration' })
  async get() {
    return this.configService.get();
  }

  @Get('contract')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current system configuration contract' })
  async getContract() {
    return this.configService.getContract();
  }

  @Get('public-contract')
  @ApiOperation({ summary: 'Get public system configuration contract for unauthenticated views' })
  async getPublicContract() {
    return this.configService.getPublicContract();
  }

  @Put()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.config.manage')
  @ApiOperation({ summary: 'Update system configuration' })
  async update(@Body() dto: UpdateSystemConfigDto) {
    return this.configService.update(dto);
  }

  @Put('contract')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.config.manage')
  @ApiOperation({ summary: 'Update system configuration contract' })
  async updateContract(@Body() dto: UpdateSystemConfigContractDto) {
    return this.configService.updateContract(dto);
  }
}
