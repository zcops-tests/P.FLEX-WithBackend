import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { UpdateSystemConfigDto } from './dto/system-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('System Configuration')
@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get current system configuration' })
  async get() {
    return this.configService.get();
  }

  @Put()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update system configuration' })
  async update(@Body() dto: UpdateSystemConfigDto) {
    return this.configService.update(dto);
  }
}
