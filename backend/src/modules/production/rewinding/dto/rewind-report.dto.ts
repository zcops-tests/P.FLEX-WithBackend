import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRewindReportDto {
  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  reported_at: string;

  @ApiProperty({ example: 'uuid-ot', required: false })
  @IsUUID()
  @IsOptional()
  work_order_id?: string;

  @ApiProperty({ example: 'uuid-machine' })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({ example: 'uuid-operator', required: false })
  @IsUUID()
  @IsOptional()
  operator_id?: string;

  @ApiProperty({ example: 'uuid-shift', required: false })
  @IsUUID()
  @IsOptional()
  shift_id?: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @IsOptional()
  rolls_finished?: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsOptional()
  labels_per_roll?: number;

  @ApiProperty({ example: 18000, required: false })
  @IsNumber()
  @IsOptional()
  total_labels?: number;

  @ApiProperty({ example: 1200, required: false })
  @IsNumber()
  @IsOptional()
  total_meters?: number;

  @ApiProperty({ example: 2, required: false })
  @IsNumber()
  @IsOptional()
  waste_rolls?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  quality_check?: boolean;

  @ApiProperty({ example: 'PARTIAL', required: false })
  @IsString()
  @IsOptional()
  production_status?: string;

  @ApiProperty({ example: 'Observaciones de rebobinado', required: false })
  @IsString()
  @IsOptional()
  observations?: string;
}
