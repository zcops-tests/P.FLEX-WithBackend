import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import {
  CreatePackagingReportDto,
  UpdatePackagingReportDto,
} from './dto/packaging-report.dto';
import { PackagingReportQueryDto } from './dto/packaging-report-query.dto';
import { PackagingService } from './packaging.service';

@ApiTags('Production: Packaging')
@Controller('production/packaging')
@UseGuards(JwtAuthGuard, PermissionsGuard, ContextualGuard)
@ApiBearerAuth()
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Post('reports')
  @Permissions('reports.packaging.create')
  @ApiOperation({ summary: 'Submit a new packaging report' })
  async createReport(@Body() dto: CreatePackagingReportDto, @Request() req) {
    return this.packagingService.createReport(dto, req.user.sub || req.user.id);
  }

  @Put('reports/:id')
  @Permissions('reports.packaging.create')
  @ApiOperation({ summary: 'Update an existing packaging report' })
  async updateReport(
    @Param('id') id: string,
    @Body() dto: UpdatePackagingReportDto,
    @Request() req,
  ) {
    return this.packagingService.updateReport(
      id,
      dto,
      req.user.sub || req.user.id,
    );
  }

  @Get('reports')
  @Permissions('reports.packaging.view')
  @ApiOperation({ summary: 'Get all packaging reports with filters' })
  @ApiQuery({ name: 'operatorId', required: false, type: String })
  @ApiQuery({ name: 'lotStatus', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllReports(@Query() query: PackagingReportQueryDto) {
    return this.packagingService.findAllReports(query);
  }

  @Get('reports/:id')
  @Permissions('reports.packaging.view')
  @ApiOperation({ summary: 'Get a specific packaging report' })
  async findOneReport(@Param('id') id: string) {
    return this.packagingService.findOneReport(id);
  }
}
