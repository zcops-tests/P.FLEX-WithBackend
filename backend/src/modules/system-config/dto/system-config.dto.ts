import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSystemConfigDto {
  @ApiProperty({ example: 'P.FLEX-SYSTEM' })
  @IsString()
  @IsOptional()
  plant_name?: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(5)
  @Max(1440)
  @IsOptional()
  auto_logout_minutes?: number;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  @IsOptional()
  password_expiry_warning_days?: number;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(30)
  @IsOptional()
  password_policy_days?: number;

  @ApiProperty({ example: 'Welcome to the production floor' })
  @IsString()
  @IsOptional()
  operator_message?: string;

  @ApiProperty({ example: 'America/Bogota' })
  @IsString()
  @IsOptional()
  timezone_name?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  maintenance_mode_enabled?: boolean;

  @ApiProperty({ example: 'Mantenimiento programado desde las 18:00.' })
  @IsString()
  @IsOptional()
  maintenance_message?: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  offline_retention_days?: number;

  @ApiProperty({ example: 'DAILY' })
  @IsString()
  @IsOptional()
  backup_frequency?: string;

  @ApiProperty({ example: 'MANUAL_REVIEW' })
  @IsString()
  @IsOptional()
  conflict_resolution_policy?: string;

  @ApiProperty({ example: 'Revisar prioridades pendientes al iniciar turno.' })
  @IsString()
  @IsOptional()
  production_assistant_message?: string;

  @ApiProperty({ example: 'Validar mermas y cierres parciales antes del cierre diario.' })
  @IsString()
  @IsOptional()
  finishing_manager_message?: string;

  @ApiProperty({ example: 'Seguimiento diario de compromisos y desviaciones.' })
  @IsString()
  @IsOptional()
  management_message?: string;

  @ApiProperty({ example: 'AUDIT_ONLY' })
  @IsString()
  @IsOptional()
  failed_login_alert_mode?: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  failed_login_max_attempts?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  ot_allow_partial_close?: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  ot_allow_close_with_waste?: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  ot_allow_forced_close?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  ot_forced_close_requires_reason?: boolean;
}

export class UpdateSystemConfigContractShiftDto {
  @ApiProperty({ example: 'T1' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Turno 1' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '06:00:00' })
  @IsString()
  start_time!: string;

  @ApiProperty({ example: '14:00:00' })
  @IsString()
  end_time!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  crosses_midnight?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateSystemConfigContractDto {
  @ApiProperty({ type: () => UpdateSystemConfigDto })
  @ValidateNested()
  @Type(() => UpdateSystemConfigDto)
  system_config!: UpdateSystemConfigDto;

  @ApiProperty({ type: () => [UpdateSystemConfigContractShiftDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateSystemConfigContractShiftDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  shifts!: UpdateSystemConfigContractShiftDto[];
}
