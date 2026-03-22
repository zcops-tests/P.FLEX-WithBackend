import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SearchPaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { StockStatus } from './stock.dto';

export class StockQueryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ enum: StockStatus })
  @IsEnum(StockStatus)
  @IsOptional()
  status?: StockStatus;
}
