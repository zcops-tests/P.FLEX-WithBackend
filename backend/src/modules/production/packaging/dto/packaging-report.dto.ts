import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePackagingReportDto {
  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  reported_at: string;

  @ApiProperty({ example: 'uuid-ot', required: false })
  @IsUUID()
  @IsOptional()
  work_order_id?: string;

  @ApiProperty({ example: 'uuid-operator', required: false })
  @IsUUID()
  @IsOptional()
  operator_id?: string;

  @ApiProperty({ example: 'uuid-shift', required: false })
  @IsUUID()
  @IsOptional()
  shift_id?: string;

  @ApiProperty({ example: 'Operario Packaging', required: false })
  @IsString()
  @IsOptional()
  operator_name?: string;

  @ApiProperty({ example: 'Turno Dia', required: false })
  @IsString()
  @IsOptional()
  shift_name?: string;

  @ApiProperty({ example: 'COMPLETE' })
  @IsString()
  @IsOptional()
  lot_status?: string;

  @ApiProperty({ example: 24 })
  @IsNumber()
  @IsOptional()
  rolls?: number;

  @ApiProperty({ example: 950 })
  @IsNumber()
  @IsOptional()
  total_meters?: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsOptional()
  demasia_rolls?: number;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @IsOptional()
  demasia_meters?: number;

  @ApiProperty({ example: 'Observaciones de empaquetado', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePackagingReportDto extends CreatePackagingReportDto {}
