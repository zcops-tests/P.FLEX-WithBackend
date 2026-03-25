import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { KpiQueryDto } from './dto/kpi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Analytics & KPIs')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('oee')
  @Roles('ADMIN', 'MANAGER', 'SUPERVISOR', 'QUALITY_MANAGER', 'FINISHING_MANAGER')
  @ApiOperation({ summary: 'Get OEE report' })
  async getOee(@Query() query: KpiQueryDto) {
    return this.analyticsService.getOee(query);
  }

  @Get('waste')
  @Roles('ADMIN', 'MANAGER', 'SUPERVISOR', 'QUALITY_MANAGER', 'FINISHING_MANAGER')
  @ApiOperation({ summary: 'Get waste report' })
  async getWaste(@Query() query: KpiQueryDto) {
    return this.analyticsService.getWaste(query);
  }

  @Get('downtime')
  @Roles('ADMIN', 'MANAGER', 'SUPERVISOR', 'QUALITY_MANAGER', 'FINISHING_MANAGER')
  @ApiOperation({ summary: 'Get downtime Pareto report' })
  async getDowntime(@Query() query: KpiQueryDto) {
    return this.analyticsService.getDowntime(query);
  }

  @Post('consolidate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Trigger daily KPI consolidation' })
  async consolidate(@Body('date') date: string) {
    return this.analyticsService.consolidateDailyKpis(new Date(date));
  }
}
