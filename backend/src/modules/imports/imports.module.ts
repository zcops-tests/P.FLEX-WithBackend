import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportWorker } from './workers/import.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'imports',
    }),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportWorker],
  exports: [ImportsService],
})
export class ImportsModule {}
