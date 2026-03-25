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
import { ClisesService } from './clises.service';
import { BulkUpsertClisesDto, CreateCliseDto, UpdateCliseDto } from './dto/clise.dto';
import { CliseQueryDto } from './dto/clise-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Inventory: Clichés')
@Controller('inventory/clises')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClisesController {
  constructor(private readonly clisesService: ClisesService) {}

  @Post()
  @Roles('Sistemas', 'Jefatura', 'Supervisor', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles')
  @ApiOperation({ summary: 'Create a new cliché' })
  async create(@Body() dto: CreateCliseDto) {
    return this.clisesService.create(dto);
  }

  @Post('bulk-upsert')
  @Roles('Sistemas', 'Jefatura', 'Supervisor', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles')
  @ApiOperation({ summary: 'Bulk import/update clichÃ©s' })
  async bulkUpsert(@Body() dto: BulkUpsertClisesDto) {
    return this.clisesService.bulkUpsert(dto.items);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clichés with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by item code, description, or client' })
  async findAll(@Query() query: CliseQueryDto) {
    return this.clisesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific cliché by ID' })
  async findOne(@Param('id') id: string) {
    return this.clisesService.findOne(id);
  }

  @Put(':id')
  @Roles('Sistemas', 'Jefatura', 'Supervisor', 'Encargado de Clisés, Troqueles y Tintas', 'Encargado de Clisés y Troqueles')
  @ApiOperation({ summary: 'Update an existing cliché' })
  async update(@Param('id') id: string, @Body() dto: UpdateCliseDto) {
    return this.clisesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Sistemas', 'Jefatura')
  @ApiOperation({ summary: 'Soft-delete a cliché' })
  async remove(@Param('id') id: string) {
    return this.clisesService.remove(id);
  }
}
