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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateStockItemDto, UpdateStockItemDto, StockStatus, UpdateStockStatusDto } from './dto/stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../modules/auth/guards/roles.guard';
import { Roles } from '../../../modules/auth/decorators/roles.decorator';

@ApiTags('Inventory: Finished Stock')
@Controller('inventory/stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'WAREHOUSE', 'FINISHING_MANAGER')
  @ApiOperation({ summary: 'Create a new stock item' })
  async create(@Body() dto: CreateStockItemDto) {
    return this.stockService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock items with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: StockStatus })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by OT, client, product, pallet, or location' })
  async findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific stock item by ID' })
  async findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'WAREHOUSE', 'FINISHING_MANAGER')
  @ApiOperation({ summary: 'Update an existing stock item' })
  async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
    return this.stockService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPERVISOR', 'WAREHOUSE', 'FINISHING_MANAGER')
  @ApiOperation({ summary: 'Update stock item status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStockStatusDto) {
    return this.stockService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete a stock item' })
  async remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
