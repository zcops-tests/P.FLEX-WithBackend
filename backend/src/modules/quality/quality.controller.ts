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
  CreateCapaActionDto,
} from './dto/incident.dto';
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
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Report a new incident' })
  async createIncident(@Body() dto: CreateIncidentDto, @Request() req) {
    return this.qualityService.createIncident(dto, req.user.sub || req.user.id);
  }

  @Get('incidents')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Get all incidents with filters' })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAllIncidents(
    @Query('status') status?: IncidentStatus,
    @Query('priority') priority?: string,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.qualityService.findAllIncidents({ status, priority, q, page, pageSize });
  }

  @Get('incidents/:id')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @ApiOperation({ summary: 'Get a specific incident' })
  async findOneIncident(@Param('id') id: string) {
    return this.qualityService.findOneIncident(id);
  }

  @Patch('incidents/:id/status')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Update incident status (state machine)' })
  async updateIncidentStatus(@Param('id') id: string, @Body() dto: UpdateIncidentStatusDto) {
    return this.qualityService.updateIncidentStatus(id, dto.status, dto.root_cause);
  }

  @Post('incidents/:id/capa')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Add a CAPA action to an incident' })
  async addCapaAction(@Param('id') id: string, @Body() dto: CreateCapaActionDto) {
    return this.qualityService.addCapaAction(id, dto);
  }

  @Patch('capa-actions/:id/complete')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Mark a CAPA action as completed' })
  async completeCapaAction(@Param('id') id: string) {
    return this.qualityService.completeCapaAction(id);
  }
}
