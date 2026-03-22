import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PrintReportStatus } from './print-report.dto';

export class PrintReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  operatorId?: string;

  @ApiPropertyOptional({ enum: PrintReportStatus })
  @IsEnum(PrintReportStatus)
  @IsOptional()
  status?: PrintReportStatus;
}
