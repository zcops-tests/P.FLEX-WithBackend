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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContextualGuard } from '../auth/guards/contextual.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Quality')
@Controller('quality')
@UseGuards(JwtAuthGuard, RolesGuard, ContextualGuard)
@ApiBearerAuth()
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('incidents')
  @Roles(
    'ADMIN',
    'MANAGER',
    'SUPERVISOR',
    'OPERATOR',
    'PLANNER',
    'PRODUCTION_ASSISTANT',
    'WAREHOUSE',
    'CLICHE_DIE_MANAGER',
    'INK_MANAGER',
    'FINISHING_MANAGER',
    'QUALITY_MANAGER',
    'AUDITOR',
  )
  @ApiOperation({ summary: 'Report a new incident' })
  async createIncident(@Body() dto: CreateIncidentDto, @Request() req) {
    return this.qualityService.createIncident(dto, req.user.sub || req.user.id);
  }

  @Get('incidents')
  @Roles(
    'ADMIN',
    'MANAGER',
    'SUPERVISOR',
    'OPERATOR',
    'PLANNER',
    'PRODUCTION_ASSISTANT',
    'WAREHOUSE',
    'CLICHE_DIE_MANAGER',
    'INK_MANAGER',
    'FINISHING_MANAGER',
    'QUALITY_MANAGER',
    'AUDITOR',
  )
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
  @Roles(
    'ADMIN',
    'MANAGER',
    'SUPERVISOR',
    'OPERATOR',
    'PLANNER',
    'PRODUCTION_ASSISTANT',
    'WAREHOUSE',
    'CLICHE_DIE_MANAGER',
    'INK_MANAGER',
    'FINISHING_MANAGER',
    'QUALITY_MANAGER',
    'AUDITOR',
  )
  @ApiOperation({ summary: 'Get a specific incident' })
  async findOneIncident(@Param('id') id: string) {
    return this.qualityService.findOneIncident(id);
  }

  @Patch('incidents/:id/status')
  @Roles('ADMIN', 'SUPERVISOR', 'MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Update incident status (state machine)' })
  async updateIncidentStatus(@Param('id') id: string, @Body() dto: UpdateIncidentStatusDto) {
    return this.qualityService.updateIncidentStatus(id, dto.status, dto.root_cause);
  }

  @Patch('incidents/:id/root-cause')
  @Roles('ADMIN', 'SUPERVISOR', 'MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Update root cause analysis for an incident' })
  async updateIncidentRootCause(@Param('id') id: string, @Body() dto: UpdateIncidentRootCauseDto) {
    return this.qualityService.updateIncidentRootCause(id, dto.root_cause);
  }

  @Post('incidents/:id/capa')
  @Roles('ADMIN', 'SUPERVISOR', 'MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Add a CAPA action to an incident' })
  async addCapaAction(@Param('id') id: string, @Body() dto: CreateCapaActionDto) {
    return this.qualityService.addCapaAction(id, dto);
  }

  @Patch('capa-actions/:id/complete')
  @Roles('ADMIN', 'SUPERVISOR', 'MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Mark a CAPA action as completed' })
  async completeCapaAction(@Param('id') id: string) {
    return this.qualityService.completeCapaAction(id);
  }
}
