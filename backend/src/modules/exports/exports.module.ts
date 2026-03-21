import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { ExportWorker } from './workers/export.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'exports',
    }),
  ],
  providers: [ExportsService, ExportWorker],
  controllers: [ExportsController],
  exports: [ExportsService],
})
export class ExportsModule {}
