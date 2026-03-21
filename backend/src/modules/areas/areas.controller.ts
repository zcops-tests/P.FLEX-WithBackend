import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AreasService } from './areas.service';
import { CreateAreaDto, UpdateAreaDto } from './dto/area.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Areas')
@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new production area' })
  @ApiResponse({ status: 201, description: 'Area created' })
  async create(@Body() createAreaDto: CreateAreaDto) {
    return this.areasService.create(createAreaDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Get all active production areas' })
  async findAll() {
    return this.areasService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Get a specific area by ID' })
  async findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an existing area' })
  async update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areasService.update(id, updateAreaDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete an area' })
  async remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
