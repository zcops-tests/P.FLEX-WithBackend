import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PlanningService } from './planning.service';
import {
  CreatePlanningScheduleDto,
  PlanningScheduleQueryDto,
  UpdatePlanningScheduleDto,
} from './dto/planning.dto';

@ApiTags('Planning')
@Controller('planning/schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get()
  @Permissions('planning.view')
  @ApiOperation({ summary: 'List planning schedule entries by date' })
  findSchedules(@Query() query: PlanningScheduleQueryDto) {
    return this.planningService.findSchedules(query);
  }

  @Post()
  @Permissions('workorders.manage')
  @ApiOperation({ summary: 'Create a planning schedule entry' })
  create(@Body() dto: CreatePlanningScheduleDto, @Request() req) {
    return this.planningService.create(dto, req.user?.sub);
  }

  @Put(':id')
  @Permissions('workorders.manage')
  @ApiOperation({ summary: 'Update a planning schedule entry' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanningScheduleDto,
    @Request() req,
  ) {
    return this.planningService.update(id, dto, req.user?.sub);
  }

  @Delete(':id')
  @Permissions('workorders.manage')
  @ApiOperation({ summary: 'Archive a planning schedule entry' })
  remove(@Param('id') id: string, @Request() req) {
    return this.planningService.remove(id, req.user?.sub);
  }
}
