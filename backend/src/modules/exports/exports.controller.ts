import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { ExportRequestDto } from './dto/export.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Data Exports')
@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('request')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Request an asynchronous data export' })
  async requestExport(@Body() dto: ExportRequestDto, @Request() req) {
    return this.exportsService.requestExport(dto, req.user.sub || req.user.id);
  }

  @Get('status/:jobId')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Get export job status' })
  async getStatus(@Param('jobId') jobId: string) {
    return this.exportsService.getJobStatus(jobId);
  }
}
