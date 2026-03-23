import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  static readonly MAX_PAGE_SIZE = 500;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: PaginationQueryDto.MAX_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PaginationQueryDto.MAX_PAGE_SIZE)
  @IsOptional()
  pageSize?: number = 20;
}

export class SearchPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'cliente' })
  @IsString()
  @IsOptional()
  q?: string;
}
