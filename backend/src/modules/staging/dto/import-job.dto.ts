import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ImportType {
  WORK_ORDER = 'WORK_ORDER',
  CLISE = 'CLISE',
  DIE = 'DIE',
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CreateImportJobDto {
  @ApiProperty({ enum: ImportType, example: ImportType.WORK_ORDER })
  @IsEnum(ImportType)
  @IsNotEmpty()
  type: ImportType;

  @ApiProperty({ example: 'Initial import of work orders' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ImportPreviewDto {
  @ApiProperty({ example: 100 })
  total_rows: number;

  @ApiProperty({ example: 95 })
  valid_rows: number;

  @ApiProperty({ example: 5 })
  invalid_rows: number;

  @ApiProperty({ example: [] })
  errors: any[];
}
