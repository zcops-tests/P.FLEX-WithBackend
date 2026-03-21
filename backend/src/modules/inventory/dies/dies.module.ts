import { Module } from '@nestjs/common';
import { DiesService } from './dies.service';
import { DiesController } from './dies.controller';

@Module({
  providers: [DiesService],
  controllers: [DiesController],
  exports: [DiesService],
})
export class DiesModule {}
