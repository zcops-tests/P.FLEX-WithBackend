import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  PDF = 'pdf',
}

export class ExportRequestDto {
  @ApiProperty({ enum: ExportFormat, default: ExportFormat.EXCEL })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ example: 'work_orders' })
  @IsString()
  @IsNotEmpty()
  entity: string;

  @ApiProperty({ example: { status: 'COMPLETED' }, required: false })
  @IsObject()
  @IsOptional()
  filters?: any;
}

export class ExportResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  status: string;
}
