import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanningShift {
  DIA = 'DIA',
  NOCHE = 'NOCHE',
}

export enum PlanningArea {
  IMPRESION = 'IMPRESION',
  TROQUELADO = 'TROQUELADO',
  REBOBINADO = 'REBOBINADO',
}

export class PlanningScheduleQueryDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: PlanningShift })
  @IsEnum(PlanningShift)
  @IsOptional()
  shift?: PlanningShift;

  @ApiPropertyOptional({ enum: PlanningArea })
  @IsEnum(PlanningArea)
  @IsOptional()
  area?: PlanningArea;
}

export class CreatePlanningScheduleDto {
  @ApiProperty({ example: 'ot-id-1' })
  @IsString()
  @IsNotEmpty()
  work_order_id: string;

  @ApiProperty({ example: 'machine-id-1' })
  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  schedule_date: string;

  @ApiProperty({ enum: PlanningShift })
  @IsEnum(PlanningShift)
  shift: PlanningShift;

  @ApiProperty({ enum: PlanningArea })
  @IsEnum(PlanningArea)
  area: PlanningArea;

  @ApiProperty({ example: '08:00' })
  @Matches(/^\d{2}:\d{2}$/)
  start_time: string;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes: number;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  @IsString()
  @IsOptional()
  operator_name?: string;

  @ApiPropertyOptional({ example: 'Revisar clisés antes de iniciar.' })
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePlanningScheduleDto {
  @ApiPropertyOptional({ example: 'machine-id-1' })
  @IsString()
  @IsOptional()
  machine_id?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsDateString()
  @IsOptional()
  schedule_date?: string;

  @ApiPropertyOptional({ enum: PlanningShift })
  @IsEnum(PlanningShift)
  @IsOptional()
  shift?: PlanningShift;

  @ApiPropertyOptional({ enum: PlanningArea })
  @IsEnum(PlanningArea)
  @IsOptional()
  area?: PlanningArea;

  @ApiPropertyOptional({ example: '08:00' })
  @Matches(/^\d{2}:\d{2}$/)
  @IsOptional()
  start_time?: string;

  @ApiPropertyOptional({ example: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  @IsString()
  @IsOptional()
  operator_name?: string;

  @ApiPropertyOptional({ example: 'Revisar clisés antes de iniciar.' })
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Ajuste manual del histórico.' })
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  @IsString()
  @IsOptional()
  change_reason?: string;
}
