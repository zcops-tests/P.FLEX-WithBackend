import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AuditQueryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: 'work_orders' })
  @IsString()
  @IsOptional()
  entity?: string;

  @ApiPropertyOptional({ example: 'UPDATE' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ example: 'uuid-user' })
  @IsString()
  @IsOptional()
  user_id?: string;
}
