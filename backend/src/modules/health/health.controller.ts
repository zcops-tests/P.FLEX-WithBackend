import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';

type ReadinessStatus = 'UP' | 'DOWN';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get('live')
  @SkipThrottle()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Process is active' })
  live() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @SkipThrottle()
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Services are ready' })
  @ApiResponse({ status: 503, description: 'One or more services are down' })
  async ready() {
    const status: Record<'database' | 'redis', ReadinessStatus> = {
      database: 'DOWN',
      redis: 'DOWN',
    };

    try {
      // Database check
      await this.prisma.$queryRaw`SELECT 1`;
      status.database = 'UP';
    } catch (e) {
      status.database = 'DOWN';
    }

    try {
      // Redis check
      await this.redis.getClient().ping();
      status.redis = 'UP';
    } catch (e) {
      status.redis = 'DOWN';
    }

    const isReady = Object.values(status).every((v) => v === 'UP');

    if (!isReady) {
      throw new HttpException(
        { status: 'DOWN', components: status },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'UP',
      components: status,
      timestamp: new Date().toISOString(),
    };
  }
}
