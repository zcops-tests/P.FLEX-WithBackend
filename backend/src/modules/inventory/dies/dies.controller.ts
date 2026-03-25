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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiesService } from './dies.service';
import { BulkUpsertDiesDto, CreateDieDto, UpdateDieDto } from './dto/die.dto';
import { DieQueryDto } from './dto/die-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Inventory: Dies')
@Controller('inventory/dies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiesController {
  constructor(private readonly diesService: DiesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'WAREHOUSE', 'CLICHE_DIE_MANAGER')
  @ApiOperation({ summary: 'Create a new die' })
  async create(@Body() dto: CreateDieDto) {
    return this.diesService.create(dto);
  }

  @Post('bulk-upsert')
  @Roles('ADMIN', 'SUPERVISOR', 'WAREHOUSE', 'CLICHE_DIE_MANAGER')
  @ApiOperation({ summary: 'Bulk import/update dies' })
  async bulkUpsert(@Body() dto: BulkUpsertDiesDto) {
    return this.diesService.bulkUpsert(dto.items);
  }

  @Get()
  @ApiOperation({ summary: 'Get all dies with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by serie, misura, client, or material' })
  async findAll(@Query() query: DieQueryDto) {
    return this.diesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific die by ID' })
  async findOne(@Param('id') id: string) {
    return this.diesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'WAREHOUSE', 'CLICHE_DIE_MANAGER')
  @ApiOperation({ summary: 'Update an existing die' })
  async update(@Param('id') id: string, @Body() dto: UpdateDieDto) {
    return this.diesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete a die' })
  async remove(@Param('id') id: string) {
    return this.diesService.remove(id);
  }
}
