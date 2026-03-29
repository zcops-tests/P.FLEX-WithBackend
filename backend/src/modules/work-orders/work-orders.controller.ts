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
  ApiResponse,
} from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import {
  BulkUpsertWorkOrdersDto,
  CreateWorkOrderDto,
  ExitWorkOrderManagementDto,
  WorkOrderStatus,
  UpdateWorkOrderStatusDto,
} from './dto/work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Work Orders')
@Controller('work-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @Permissions('workorders.manage')
  @ApiOperation({ summary: 'Crear una nueva orden de trabajo' })
  @ApiResponse({ status: 201, description: 'Orden creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createWorkOrderDto: CreateWorkOrderDto) {
    return this.workOrdersService.create(createWorkOrderDto);
  }

  @Post('bulk-upsert')
  @Permissions('workorders.manage')
  @ApiOperation({ summary: 'Crear o actualizar órdenes de trabajo en lote' })
  @ApiResponse({ status: 201, description: 'Lote procesado exitosamente' })
  bulkUpsert(@Body() dto: BulkUpsertWorkOrdersDto) {
    return this.workOrdersService.bulkUpsert(dto.items);
  }

  @Get()
  @Permissions('workorders.view')
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: WorkOrderStatus })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search by OT, description, client, or material',
  })
  async findAll(@Query() query: WorkOrderQueryDto) {
    return this.workOrdersService.findAll(query);
  }

  @Get('management')
  @Permissions('workorders.view')
  @ApiOperation({ summary: 'List work orders currently in management' })
  async findManagement() {
    return this.workOrdersService.findManagement();
  }

  @Get(':id')
  @Permissions('workorders.view')
  @ApiOperation({ summary: 'Get a specific work order by ID' })
  async findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Put(':id')
  @Permissions('workorders.manage')
  @ApiOperation({ summary: 'Update an existing work order' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkOrderDto>,
  ) {
    return this.workOrdersService.update(id, dto);
  }

  @Patch(':id/status')
  @Permissions('workorders.status.update')
  @ApiOperation({ summary: 'Update work order status (state machine)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.workOrdersService.updateStatus(id, dto.status);
  }

  @Post(':id/management/enter')
  @Permissions('workorders.management.manage')
  @ApiOperation({ summary: 'Enter a work order into management' })
  async enterManagement(@Param('id') id: string, @Request() req) {
    return this.workOrdersService.enterManagement(id, req.user.sub);
  }

  @Post(':id/management/exit')
  @Permissions('workorders.management.manage')
  @ApiOperation({ summary: 'Exit a work order from management' })
  async exitManagement(
    @Param('id') id: string,
    @Body() dto: ExitWorkOrderManagementDto,
    @Request() req,
  ) {
    return this.workOrdersService.exitManagement(
      id,
      dto.exit_action,
      req.user.sub,
    );
  }

  @Delete(':id')
  @Permissions('workorders.delete')
  @ApiOperation({ summary: 'Soft-delete a work order' })
  async remove(@Param('id') id: string) {
    return this.workOrdersService.remove(id);
  }
}
