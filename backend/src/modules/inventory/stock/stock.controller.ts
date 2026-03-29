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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StockService } from './stock.service';
import {
  CreateStockItemDto,
  UpdateStockItemDto,
  StockStatus,
  UpdateStockStatusDto,
} from './dto/stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';

@ApiTags('Inventory: Finished Stock')
@Controller('inventory/stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Permissions('inventory.stock.manage')
  @ApiOperation({ summary: 'Create a new stock item' })
  async create(@Body() dto: CreateStockItemDto) {
    return this.stockService.create(dto);
  }

  @Get()
  @Permissions('inventory.stock.view')
  @ApiOperation({ summary: 'Get all stock items with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: StockStatus })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search by OT, client, product, pallet, or location',
  })
  async findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get(':id')
  @Permissions('inventory.stock.view')
  @ApiOperation({ summary: 'Get a specific stock item by ID' })
  async findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Put(':id')
  @Permissions('inventory.stock.manage')
  @ApiOperation({ summary: 'Update an existing stock item' })
  async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
    return this.stockService.update(id, dto);
  }

  @Patch(':id/status')
  @Permissions('inventory.stock.manage')
  @ApiOperation({ summary: 'Update stock item status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStockStatusDto,
  ) {
    return this.stockService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Permissions('inventory.stock.delete')
  @ApiOperation({ summary: 'Soft-delete a stock item' })
  async remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
