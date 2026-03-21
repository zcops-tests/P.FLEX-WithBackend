import { Module } from '@nestjs/common';
import { StagingService } from './staging.service';
import { StagingController } from './staging.controller';

@Module({
  providers: [StagingService],
  controllers: [StagingController],
  exports: [StagingService],
})
export class StagingModule {}
