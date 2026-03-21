import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ImportStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CreateImportJobDto {
  @ApiProperty({ example: 'work_orders' })
  @IsString()
  entity_name: string;

  @ApiProperty({ example: 'file-uuid' })
  @IsUUID()
  file_id: string;
}

export class ImportJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ImportStatus })
  status: ImportStatus;

  @ApiProperty()
  total_rows: number;

  @ApiProperty()
  valid_rows: number;

  @ApiProperty()
  invalid_rows: number;

  @ApiProperty()
  applied_rows: number;
}
