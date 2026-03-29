import { Module } from '@nestjs/common';
import { RewindingController } from './rewinding.controller';
import { RewindingService } from './rewinding.service';

@Module({
  controllers: [RewindingController],
  providers: [RewindingService],
  exports: [RewindingService],
})
export class RewindingModule {}
