import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { QueuesModule } from './modules/queues/queues.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { AreasModule } from './modules/areas/areas.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UsersModule } from './modules/users/users.module';
import { MachinesModule } from './modules/machines/machines.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { StagingModule } from './modules/staging/staging.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { ClisesModule } from './modules/inventory/clises/clises.module';
import { DiesModule } from './modules/inventory/dies/dies.module';
import { RacksModule } from './modules/inventory/racks/racks.module';
import { StockModule } from './modules/inventory/stock/stock.module';
import { QualityModule } from './modules/quality/quality.module';
import { PrintingModule } from './modules/production/printing/printing.module';
import { DiecuttingModule } from './modules/production/diecutting/diecutting.module';
import { RewindingModule } from './modules/production/rewinding/rewinding.module';
import { PackagingModule } from './modules/production/packaging/packaging.module';
import { SyncModule } from './modules/sync/sync.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FilesModule } from './modules/files/files.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ImportsModule } from './modules/imports/imports.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { validateEnv } from './config/env.validation';

import { UserStatusGuard } from './modules/auth/guards/user-status.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (req, res) => ({
          context: 'HTTP',
        }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    CommonModule,
    DatabaseModule,
    HealthModule,
    AuditModule,
    AuthModule,
    QueuesModule,
    SystemConfigModule,
    AreasModule,
    RolesModule,
    PermissionsModule,
    UsersModule,
    MachinesModule,
    ShiftsModule,
    StagingModule,
    WorkOrdersModule,
    ClisesModule,
    DiesModule,
    RacksModule,
    StockModule,
    QualityModule,
    PrintingModule,
    DiecuttingModule,
    RewindingModule,
    PackagingModule,
    SyncModule,
    AnalyticsModule,
    FilesModule,
    ExportsModule,
    ImportsModule,
    OutboxModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserStatusGuard,
    },
  ],
})
export class AppModule {}
