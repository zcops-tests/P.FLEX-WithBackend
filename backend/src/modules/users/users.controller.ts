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
import { UsersService } from './users.service';
import { CreateUserDto, IdentifyOperatorDto, UpdateUserDto } from './dto/user.dto';
import { AssignAreaDto } from './dto/assign-area.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Get all active users' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('operator-identification')
  @Permissions('operator.host')
  @ApiOperation({ summary: 'Identify an operator by DNI for a hosted terminal session' })
  async identifyOperator(@Body() dto: IdentifyOperatorDto) {
    return this.usersService.identifyOperatorByDni(dto.dni);
  }

  @Get(':id')
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Get a specific user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Update an existing user' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Soft-delete a user' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/areas')
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Assign an area to a user' })
  async assignArea(@Param('id') id: string, @Body() dto: AssignAreaDto) {
    return this.usersService.assignArea(id, dto.area_id);
  }

  @Delete(':id/areas/:areaId')
  @Permissions('admin.users.manage')
  @ApiOperation({ summary: 'Unassign an area from a user' })
  async unassignArea(@Param('id') id: string, @Param('areaId') areaId: string) {
    return this.usersService.unassignArea(id, areaId);
  }
}
