import { Module } from '@nestjs/common';
import { ClisesService } from './clises.service';
import { ClisesController } from './clises.controller';

@Module({
  providers: [ClisesService],
  controllers: [ClisesController],
  exports: [ClisesService],
})
export class ClisesModule {}
