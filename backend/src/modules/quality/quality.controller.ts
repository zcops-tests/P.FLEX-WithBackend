import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
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
import { QualityService } from './quality.service';
import {
  CreateIncidentDto,
  IncidentStatus,
  UpdateIncidentStatusDto,
  UpdateIncidentRootCauseDto,
  CreateCapaActionDto,
} from './dto/incident.dto';
import { IncidentsQueryDto } from './dto/incidents-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContextualGuard } from '../auth/guards/contextual.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Quality')
@Controller('quality')
@UseGuards(JwtAuthGuard, PermissionsGuard, ContextualGuard)
@ApiBearerAuth()
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('incidents')
  @Permissions('quality.incidents.create')
  @ApiOperation({ summary: 'Report a new incident' })
  async createIncident(@Body() dto: CreateIncidentDto, @Request() req) {
    return this.qualityService.createIncident(dto, req.user.sub || req.user.id);
  }

  @Get('incidents')
  @Permissions('quality.incidents.view')
  @ApiOperation({ summary: 'Get all incidents with filters' })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllIncidents(@Query() query: IncidentsQueryDto) {
    return this.qualityService.findAllIncidents(query);
  }

  @Get('incidents/:id')
  @Permissions('quality.incidents.view')
  @ApiOperation({ summary: 'Get a specific incident' })
  async findOneIncident(@Param('id') id: string) {
    return this.qualityService.findOneIncident(id);
  }

  @Patch('incidents/:id/status')
  @Permissions('quality.incidents.manage')
  @ApiOperation({ summary: 'Update incident status (state machine)' })
  async updateIncidentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.qualityService.updateIncidentStatus(
      id,
      dto.status,
      dto.root_cause,
    );
  }

  @Patch('incidents/:id/root-cause')
  @Permissions('quality.incidents.manage')
  @ApiOperation({ summary: 'Update root cause analysis for an incident' })
  async updateIncidentRootCause(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentRootCauseDto,
  ) {
    return this.qualityService.updateIncidentRootCause(id, dto.root_cause);
  }

  @Post('incidents/:id/capa')
  @Permissions('quality.incidents.manage')
  @ApiOperation({ summary: 'Add a CAPA action to an incident' })
  async addCapaAction(
    @Param('id') id: string,
    @Body() dto: CreateCapaActionDto,
  ) {
    return this.qualityService.addCapaAction(id, dto);
  }

  @Patch('capa-actions/:id/complete')
  @Permissions('quality.incidents.manage')
  @ApiOperation({ summary: 'Mark a CAPA action as completed' })
  async completeCapaAction(@Param('id') id: string) {
    return this.qualityService.completeCapaAction(id);
  }
}
