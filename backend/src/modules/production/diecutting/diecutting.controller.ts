import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  UseGuards,
  Patch,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiecuttingService } from './diecutting.service';
import {
  CreateDiecutReportDto,
  DiecutReportStatus,
  UpdateDiecutReportStatusDto,
} from './dto/diecut-report.dto';
import { DiecutReportQueryDto } from './dto/diecut-report-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContextualGuard } from '../../auth/guards/contextual.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Production: Die-cutting')
@Controller('production/diecutting')
@UseGuards(JwtAuthGuard, PermissionsGuard, ContextualGuard)
@ApiBearerAuth()
export class DiecuttingController {
  constructor(private readonly diecuttingService: DiecuttingService) {}

  @Post('reports')
  @Permissions('reports.diecut.create')
  @ApiOperation({ summary: 'Submit a new die-cutting report' })
  async createReport(@Body() dto: CreateDiecutReportDto, @Request() req) {
    return this.diecuttingService.createReport(dto, req.user.sub || req.user.id);
  }

  @Get('reports')
  @Permissions('reports.diecut.view')
  @ApiOperation({ summary: 'Get all die-cutting reports with filters' })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  @ApiQuery({ name: 'operatorId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: DiecutReportStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllReports(@Query() query: DiecutReportQueryDto) {
    return this.diecuttingService.findAllReports(query);
  }

  @Get('reports/:id')
  @Permissions('reports.diecut.view')
  @ApiOperation({ summary: 'Get a specific die-cutting report' })
  async findOneReport(@Param('id') id: string) {
    return this.diecuttingService.findOneReport(id);
  }

  @Patch('reports/:id/status')
  @Permissions('reports.diecut.status.manage')
  @ApiOperation({ summary: 'Update report status (state machine)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateDiecutReportStatusDto) {
    return this.diecuttingService.updateStatus(id, dto.status);
  }

  @Post('reports/:id/lock')
  @Permissions('reports.diecut.create')
  @ApiOperation({ summary: 'Lock a report for editing' })
  async lockReport(@Param('id') id: string, @Request() req) {
    return this.diecuttingService.lockReport(id, req.user.sub || req.user.id);
  }

  @Post('reports/:id/unlock')
  @Permissions('reports.diecut.create')
  @ApiOperation({ summary: 'Unlock a report' })
  async unlockReport(@Param('id') id: string) {
    return this.diecuttingService.unlockReport(id);
  }
}
