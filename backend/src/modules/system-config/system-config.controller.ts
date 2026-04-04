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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get current system configuration' })
  async get() {
    return this.configService.get();
  }

  @Get('contract')
  @ApiOperation({ summary: 'Get current system configuration contract' })
  async getContract() {
    return this.configService.getContract();
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
