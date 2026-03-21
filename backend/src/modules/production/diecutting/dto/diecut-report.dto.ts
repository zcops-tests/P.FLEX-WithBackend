import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum DiecutReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  CORRECTED = 'CORRECTED',
}

export enum DiecutActivityType {
  SETUP = 'SETUP',
  RUN = 'RUN',
  STOP = 'STOP',
}

export class CreateDiecutActivityDto {
  @ApiProperty({ enum: DiecutActivityType, example: DiecutActivityType.RUN })
  @IsEnum(DiecutActivityType)
  @IsNotEmpty()
  activity_type: DiecutActivityType;

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

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsOptional()
  quantity?: number;
}

export class CreateDiecutReportDto {
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

  @ApiProperty({ example: 'uuid-die' })
  @IsUUID()
  @IsOptional()
  die_id?: string;

  @ApiProperty({ example: 'PARTIAL' })
  @IsString()
  @IsOptional()
  production_status?: string;

  @ApiProperty({ example: 'OK' })
  @IsString()
  @IsOptional()
  die_status?: string;

  @ApiProperty({ example: 'Observations' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ type: [CreateDiecutActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDiecutActivityDto)
  activities: CreateDiecutActivityDto[];
}

export class UpdateDiecutReportDto extends CreateDiecutReportDto {}

export class UpdateDiecutReportStatusDto {
  @ApiProperty({ enum: DiecutReportStatus })
  @IsEnum(DiecutReportStatus)
  @IsNotEmpty()
  status: DiecutReportStatus;
}
