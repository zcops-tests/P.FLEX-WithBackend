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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RacksService } from './racks.service';
import { CreateRackConfigDto, UpdateRackConfigDto } from './dto/rack.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Inventory: Racks')
@Controller('inventory/racks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RacksController {
  constructor(private readonly racksService: RacksService) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE', 'CLICHE_DIE_MANAGER')
  @ApiOperation({ summary: 'Create a new rack configuration' })
  async create(@Body() dto: CreateRackConfigDto) {
    return this.racksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rack configurations' })
  async findAll() {
    return this.racksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific rack configuration by ID' })
  async findOne(@Param('id') id: string) {
    return this.racksService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'WAREHOUSE', 'CLICHE_DIE_MANAGER')
  @ApiOperation({ summary: 'Update an existing rack configuration' })
  async update(@Param('id') id: string, @Body() dto: UpdateRackConfigDto) {
    return this.racksService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'WAREHOUSE', 'CLICHE_DIE_MANAGER')
  @ApiOperation({ summary: 'Soft-delete a rack configuration' })
  async remove(@Param('id') id: string) {
    return this.racksService.remove(id);
  }
}
