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
import { CreateCliseDto, UpdateCliseDto } from './dto/clise.dto';
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
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Create a new cliché' })
  async create(@Body() dto: CreateCliseDto) {
    return this.clisesService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'WAREHOUSE')
  @ApiOperation({ summary: 'Get all clichés with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by item code, description, or client' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('q') q?: string,
  ) {
    return this.clisesService.findAll({ page, pageSize, q });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'WAREHOUSE')
  @ApiOperation({ summary: 'Get a specific cliché by ID' })
  async findOne(@Param('id') id: string) {
    return this.clisesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Update an existing cliché' })
  async update(@Param('id') id: string, @Body() dto: UpdateCliseDto) {
    return this.clisesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete a cliché' })
  async remove(@Param('id') id: string) {
    return this.clisesService.remove(id);
  }
}
