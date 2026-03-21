import { Module } from '@nestjs/common';
import { DiecuttingService } from './diecutting.service';
import { DiecuttingController } from './diecutting.controller';
import { StockModule } from '../../inventory/stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [DiecuttingService],
  controllers: [DiecuttingController],
  exports: [DiecuttingService],
})
export class DiecuttingModule {}
