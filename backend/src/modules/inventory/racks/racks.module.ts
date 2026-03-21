import { Module } from '@nestjs/common';
import { RacksService } from './racks.service';
import { RacksController } from './racks.controller';
import { RelationsService } from './relations.service';
import { RelationsController } from './relations.controller';

@Module({
  providers: [RacksService, RelationsService],
  controllers: [RacksController, RelationsController],
  exports: [RacksService, RelationsService],
})
export class RacksModule {}
