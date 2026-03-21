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
import { PrintingService } from './printing.service';
import {
  CreatePrintReportDto,
  PrintReportStatus,
  UpdatePrintReportStatusDto,
} from './dto/print-report.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ContextualGuard } from '../../auth/guards/contextual.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Production: Printing')
@Controller('production/printing')
@UseGuards(JwtAuthGuard, RolesGuard, ContextualGuard)
@ApiBearerAuth()
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Post('reports')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Submit a new print report' })
  async createReport(@Body() dto: CreatePrintReportDto, @Request() req) {
    return this.printingService.createReport(dto, req.user.sub || req.user.id);
  }

  @Get('reports')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Get all print reports with filters' })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  @ApiQuery({ name: 'operatorId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PrintReportStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllReports(
    @Query('machineId') machineId?: string,
    @Query('operatorId') operatorId?: string,
    @Query('status') status?: PrintReportStatus,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.printingService.findAllReports({ machineId, operatorId, status, page, pageSize });
  }

  @Get('reports/:id')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Get a specific print report' })
  async findOneReport(@Param('id') id: string) {
    return this.printingService.findOneReport(id);
  }

  @Patch('reports/:id/status')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Update report status (state machine)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdatePrintReportStatusDto) {
    return this.printingService.updateStatus(id, dto.status);
  }

  @Post('reports/:id/lock')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Lock a report for editing' })
  async lockReport(@Param('id') id: string, @Request() req) {
    return this.printingService.lockReport(id, req.user.sub || req.user.id);
  }

  @Post('reports/:id/unlock')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Unlock a report' })
  async unlockReport(@Param('id') id: string) {
    return this.printingService.unlockReport(id);
  }
}
