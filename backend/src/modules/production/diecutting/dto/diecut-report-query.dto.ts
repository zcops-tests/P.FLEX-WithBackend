import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { DiecutReportStatus } from './diecut-report.dto';

export class DiecutReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  operatorId?: string;

  @ApiPropertyOptional({ enum: DiecutReportStatus })
  @IsEnum(DiecutReportStatus)
  @IsOptional()
  status?: DiecutReportStatus;
}
