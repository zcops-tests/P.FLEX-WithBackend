import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncPullRequestDto, SyncPushRequestDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Synchronization')
@Controller('sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('sync.manage')
@ApiBearerAuth()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get synchronization status summary' })
  async status() {
    return this.syncService.getStatus();
  }

  @Get('pull')
  @ApiOperation({ summary: 'Incremental pull of changes' })
  async pull(@Query() dto: SyncPullRequestDto) {
    return this.syncService.pullChanges(dto);
  }

  @Post('push')
  @ApiOperation({ summary: 'Idempotent push of mutations' })
  async push(@Body() dto: SyncPushRequestDto, @Request() req) {
    return this.syncService.pushMutations(dto, req.user.sub || req.user.id);
  }
}
