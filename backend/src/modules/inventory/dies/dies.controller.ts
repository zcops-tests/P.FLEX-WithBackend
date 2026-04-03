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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DiesService } from './dies.service';
import { BulkUpsertDiesDto, CreateDieDto, UpdateDieDto } from './dto/die.dto';
import { DieQueryDto } from './dto/die-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Inventory: Dies')
@Controller('inventory/dies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DiesController {
  constructor(private readonly diesService: DiesService) {}

  @Post()
  @Permissions('inventory.dies.manage')
  @ApiOperation({ summary: 'Create a new die' })
  async create(@Body() dto: CreateDieDto) {
    return this.diesService.create(dto);
  }

  @Post('bulk-upsert')
  @Permissions('inventory.dies.manage')
  @ApiOperation({ summary: 'Bulk import/update dies' })
  async bulkUpsert(@Body() dto: BulkUpsertDiesDto) {
    return this.diesService.bulkUpsert(dto.items);
  }

  @Get()
  @Permissions('inventory.dies.view')
  @ApiOperation({ summary: 'Get all dies with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search by serie, misura, client, or material',
  })
  async findAll(@Query() query: DieQueryDto) {
    return this.diesService.findAll(query);
  }

  @Get('catalog')
  @Permissions('inventory.dies.view')
  @ApiOperation({ summary: 'Get all active dies without pagination' })
  async findCatalog() {
    return this.diesService.findCatalog();
  }

  @Get(':id')
  @Permissions('inventory.dies.view')
  @ApiOperation({ summary: 'Get a specific die by ID' })
  async findOne(@Param('id') id: string) {
    return this.diesService.findOne(id);
  }

  @Put(':id')
  @Permissions('inventory.dies.manage')
  @ApiOperation({ summary: 'Update an existing die' })
  async update(@Param('id') id: string, @Body() dto: UpdateDieDto) {
    return this.diesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory.dies.delete')
  @ApiOperation({ summary: 'Soft-delete a die' })
  async remove(@Param('id') id: string) {
    return this.diesService.remove(id);
  }
}
