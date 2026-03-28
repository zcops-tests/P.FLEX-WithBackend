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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Inventory: Racks')
@Controller('inventory/racks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RacksController {
  constructor(private readonly racksService: RacksService) {}

  @Post()
  @Permissions('inventory.racks.manage')
  @ApiOperation({ summary: 'Create a new rack configuration' })
  async create(@Body() dto: CreateRackConfigDto) {
    return this.racksService.create(dto);
  }

  @Get()
  @Permissions('inventory.racks.manage')
  @ApiOperation({ summary: 'Get all rack configurations' })
  async findAll() {
    return this.racksService.findAll();
  }

  @Get(':id')
  @Permissions('inventory.racks.manage')
  @ApiOperation({ summary: 'Get a specific rack configuration by ID' })
  async findOne(@Param('id') id: string) {
    return this.racksService.findOne(id);
  }

  @Put(':id')
  @Permissions('inventory.racks.manage')
  @ApiOperation({ summary: 'Update an existing rack configuration' })
  async update(@Param('id') id: string, @Body() dto: UpdateRackConfigDto) {
    return this.racksService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory.racks.manage')
  @ApiOperation({ summary: 'Soft-delete a rack configuration' })
  async remove(@Param('id') id: string) {
    return this.racksService.remove(id);
  }
}
