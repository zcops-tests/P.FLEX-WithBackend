import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ContextualGuard } from '../../auth/guards/contextual.guard';
import { CreateRewindReportDto } from './dto/rewind-report.dto';
import { RewindReportQueryDto } from './dto/rewind-report-query.dto';
import { RewindingService } from './rewinding.service';

@ApiTags('Production: Rewinding')
@Controller('production/rewinding')
@UseGuards(JwtAuthGuard, PermissionsGuard, ContextualGuard)
@ApiBearerAuth()
export class RewindingController {
  constructor(private readonly rewindingService: RewindingService) {}

  @Post('reports')
  @Permissions('reports.rewind.create')
  @ApiOperation({ summary: 'Submit a new rewind report' })
  async createReport(@Body() dto: CreateRewindReportDto, @Request() req) {
    return this.rewindingService.createReport(dto, req.user.sub || req.user.id);
  }

  @Get('reports')
  @Permissions('reports.rewind.view')
  @ApiOperation({ summary: 'Get all rewind reports with filters' })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  @ApiQuery({ name: 'operatorId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllReports(@Query() query: RewindReportQueryDto) {
    return this.rewindingService.findAllReports(query);
  }

  @Get('reports/:id')
  @Permissions('reports.rewind.view')
  @ApiOperation({ summary: 'Get a specific rewind report' })
  async findOneReport(@Param('id') id: string) {
    return this.rewindingService.findOneReport(id);
  }
}
