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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PrintingService } from './printing.service';
import {
  CreatePrintReportDto,
  PrintReportStatus,
  UpdatePrintReportStatusDto,
} from './dto/print-report.dto';
import { PrintReportQueryDto } from './dto/print-report-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContextualGuard } from '../../auth/guards/contextual.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Production: Printing')
@Controller('production/printing')
@UseGuards(JwtAuthGuard, PermissionsGuard, ContextualGuard)
@ApiBearerAuth()
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Post('reports')
  @Permissions('reports.print.create')
  @ApiOperation({ summary: 'Submit a new print report' })
  async createReport(@Body() dto: CreatePrintReportDto, @Request() req) {
    return this.printingService.createReport(dto, req.user.sub || req.user.id);
  }

  @Get('reports')
  @Permissions('reports.print.view')
  @ApiOperation({ summary: 'Get all print reports with filters' })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  @ApiQuery({ name: 'operatorId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PrintReportStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllReports(@Query() query: PrintReportQueryDto) {
    return this.printingService.findAllReports(query);
  }

  @Get('reports/:id')
  @Permissions('reports.print.view')
  @ApiOperation({ summary: 'Get a specific print report' })
  async findOneReport(@Param('id') id: string) {
    return this.printingService.findOneReport(id);
  }

  @Patch('reports/:id/status')
  @Permissions('reports.print.status.manage')
  @ApiOperation({ summary: 'Update report status (state machine)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePrintReportStatusDto,
  ) {
    return this.printingService.updateStatus(id, dto.status);
  }

  @Post('reports/:id/lock')
  @Permissions('reports.print.create')
  @ApiOperation({ summary: 'Lock a report for editing' })
  async lockReport(@Param('id') id: string, @Request() req) {
    return this.printingService.lockReport(id, req.user.sub || req.user.id);
  }

  @Post('reports/:id/unlock')
  @Permissions('reports.print.create')
  @ApiOperation({ summary: 'Unlock a report' })
  async unlockReport(@Param('id') id: string) {
    return this.printingService.unlockReport(id);
  }
}
