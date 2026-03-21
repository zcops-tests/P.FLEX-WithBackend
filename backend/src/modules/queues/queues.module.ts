import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    BullModule.registerQueueAsync(
      {
        name: 'imports',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        }),
        inject: [ConfigService],
      },
      { name: 'exports' },
      { name: 'kpi' },
      { name: 'outbox' },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
