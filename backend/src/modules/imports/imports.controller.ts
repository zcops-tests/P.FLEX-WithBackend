import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { CreateImportJobDto } from './dto/import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Create a new import job' })
  create(@Body() dto: CreateImportJobDto, @Request() req) {
    return this.importsService.createJob(dto, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import job status' })
  findOne(@Param('id') id: string) {
    return this.importsService.getJob(id);
  }

  @Post(':id/confirm')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Confirm and apply the import' })
  confirm(@Param('id') id: string, @Request() req) {
    return this.importsService.confirmImport(id, req.user.sub);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Obtener resultados detallados de la importación (Resumen de filas)' })
  async getResults(@Param('id') id: string) {
    const job = await this.importsService.getJob(id);
    const rows = await this.importsService.getStagingRows(id);
    return {
      jobId: id,
      summary: job.summary,
      rows: rows.map(r => ({
        rowNumber: r.row_number,
        status: r.row_status,
        key: r.business_key,
        errors: r.validation_errors,
      })),
    };
  }

  @Get(':id/errors/csv')
  @ApiOperation({ summary: 'Descargar reporte de errores en formato CSV' })
  async downloadErrors(@Param('id') id: string) {
    const rows = await this.importsService.getStagingRows(id);
    const errorsOnly = rows.filter(r => r.row_status === 'INVALID');
    
    // In a real scenario, convert to CSV string and return as file
    return {
      filename: `import_errors_${id}.csv`,
      data: errorsOnly.map(r => ({
        line: r.row_number,
        key: r.business_key,
        errors: r.validation_errors,
      })),
    };
  }

  @Get(':id/rows')
  @ApiOperation({ summary: 'Get staging rows for preview' })
  findRows(@Param('id') id: string) {
    return this.importsService.getStagingRows(id);
  }
}
