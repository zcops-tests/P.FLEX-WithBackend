import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PrintReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  CORRECTED = 'CORRECTED',
}

export enum PrintActivityType {
  SETUP = 'SETUP',
  RUN = 'RUN',
  STOP = 'STOP',
}

export class CreatePrintActivityDto {
  @ApiProperty({ enum: PrintActivityType, example: PrintActivityType.RUN })
  @IsEnum(PrintActivityType)
  @IsNotEmpty()
  activity_type: PrintActivityType;

  @ApiProperty({ example: '08:00:00', description: 'HH:mm:ss' })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ example: '10:00:00', description: 'HH:mm:ss' })
  @IsString()
  @IsOptional()
  end_time?: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @IsOptional()
  duration_minutes?: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @IsOptional()
  meters?: number;
}

export class CreatePrintReportDto {
  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  reported_at: string;

  @ApiProperty({ example: 'uuid-ot' })
  @IsUUID()
  @IsOptional()
  work_order_id?: string;

  @ApiProperty({ example: 'uuid-machine' })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({ example: 'uuid-shift' })
  @IsUUID()
  @IsOptional()
  shift_id?: string;

  @ApiProperty({ example: 'uuid-clise' })
  @IsUUID()
  @IsOptional()
  clise_id?: string;

  @ApiProperty({ example: 'uuid-die' })
  @IsUUID()
  @IsOptional()
  die_id?: string;

  @ApiProperty({ example: 'METROS_PRODUCIDOS' })
  @IsString()
  @IsOptional()
  production_status?: string;

  @ApiProperty({ example: 'Observations' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ type: [CreatePrintActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrintActivityDto)
  activities: CreatePrintActivityDto[];
}

export class UpdatePrintReportDto extends CreatePrintReportDto {}

export class UpdatePrintReportStatusDto {
  @ApiProperty({ enum: PrintReportStatus })
  @IsEnum(PrintReportStatus)
  @IsNotEmpty()
  status: PrintReportStatus;
}
