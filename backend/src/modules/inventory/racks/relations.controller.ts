import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RelationsService } from './relations.service';
import { CreateCliseDieLinkDto } from './dto/rack.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Inventory: Relations')
@Controller('inventory/relations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RelationsController {
  constructor(private readonly relationsService: RelationsService) {}

  @Post('clise-die')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Link a cliché with a die' })
  async link(@Body() dto: CreateCliseDieLinkDto) {
    return this.relationsService.linkCliseDie(dto);
  }

  @Delete('clise-die/:cliseId/:dieId')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Unlink a cliché from a die' })
  async unlink(
    @Param('cliseId') cliseId: string,
    @Param('dieId') dieId: string,
  ) {
    return this.relationsService.unlinkCliseDie(cliseId, dieId);
  }

  @Get('clise/:id/dies')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'WAREHOUSE')
  @ApiOperation({ summary: 'Get all dies linked to a cliché' })
  async getCliseDies(@Param('id') id: string) {
    return this.relationsService.getCliseDies(id);
  }

  @Get('die/:id/clises')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'WAREHOUSE')
  @ApiOperation({ summary: 'Get all clichés linked to a die' })
  async getDieClises(@Param('id') id: string) {
    return this.relationsService.getDieClises(id);
  }
}
