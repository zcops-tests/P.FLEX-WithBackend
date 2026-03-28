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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Analytics & KPIs')
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('oee')
  @Permissions('analytics.view')
  @ApiOperation({ summary: 'Get OEE report' })
  async getOee(@Query() query: KpiQueryDto) {
    return this.analyticsService.getOee(query);
  }

  @Get('waste')
  @Permissions('analytics.view')
  @ApiOperation({ summary: 'Get waste report' })
  async getWaste(@Query() query: KpiQueryDto) {
    return this.analyticsService.getWaste(query);
  }

  @Get('downtime')
  @Permissions('analytics.view')
  @ApiOperation({ summary: 'Get downtime Pareto report' })
  async getDowntime(@Query() query: KpiQueryDto) {
    return this.analyticsService.getDowntime(query);
  }

  @Post('consolidate')
  @Permissions('analytics.manage')
  @ApiOperation({ summary: 'Trigger daily KPI consolidation' })
  async consolidate(@Body('date') date: string) {
    return this.analyticsService.consolidateDailyKpis(new Date(date));
  }
}
