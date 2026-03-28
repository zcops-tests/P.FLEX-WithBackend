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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Data Exports')
@Controller('exports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('request')
  @Permissions('exports.manage')
  @ApiOperation({ summary: 'Request an asynchronous data export' })
  async requestExport(@Body() dto: ExportRequestDto, @Request() req) {
    return this.exportsService.requestExport(dto, req.user.sub || req.user.id);
  }

  @Get('status/:jobId')
  @Permissions('exports.manage')
  @ApiOperation({ summary: 'Get export job status' })
  async getStatus(@Param('jobId') jobId: string) {
    return this.exportsService.getJobStatus(jobId);
  }
}
