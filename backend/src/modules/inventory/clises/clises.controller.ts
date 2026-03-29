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
import { ClisesService } from './clises.service';
import {
  BulkUpsertClisesDto,
  CreateCliseDto,
  UpdateCliseDto,
} from './dto/clise.dto';
import { CliseQueryDto } from './dto/clise-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Inventory: Clichés')
@Controller('inventory/clises')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ClisesController {
  constructor(private readonly clisesService: ClisesService) {}

  @Post()
  @Permissions('inventory.clises.manage')
  @ApiOperation({ summary: 'Create a new cliché' })
  async create(@Body() dto: CreateCliseDto) {
    return this.clisesService.create(dto);
  }

  @Post('bulk-upsert')
  @Permissions('inventory.clises.manage')
  @ApiOperation({ summary: 'Bulk import/update clichÃ©s' })
  async bulkUpsert(@Body() dto: BulkUpsertClisesDto) {
    return this.clisesService.bulkUpsert(dto.items);
  }

  @Get()
  @Permissions('inventory.clises.view')
  @ApiOperation({ summary: 'Get all clichés with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search by item code, description, or client',
  })
  async findAll(@Query() query: CliseQueryDto) {
    return this.clisesService.findAll(query);
  }

  @Get(':id')
  @Permissions('inventory.clises.view')
  @ApiOperation({ summary: 'Get a specific cliché by ID' })
  async findOne(@Param('id') id: string) {
    return this.clisesService.findOne(id);
  }

  @Put(':id')
  @Permissions('inventory.clises.manage')
  @ApiOperation({ summary: 'Update an existing cliché' })
  async update(@Param('id') id: string, @Body() dto: UpdateCliseDto) {
    return this.clisesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory.clises.delete')
  @ApiOperation({ summary: 'Soft-delete a cliché' })
  async remove(@Param('id') id: string) {
    return this.clisesService.remove(id);
  }
}
