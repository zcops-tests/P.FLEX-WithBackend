import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IncidentPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum IncidentType {
  QUALITY = 'QUALITY',
  SAFETY = 'SAFETY',
  MACHINERY = 'MACHINERY',
  MATERIAL = 'MATERIAL',
  OTHER = 'OTHER',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  ANALYSIS = 'ANALYSIS',
  CORRECTIVE_ACTION = 'CORRECTIVE_ACTION',
  CLOSED = 'CLOSED',
}

export enum CapaActionType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
}

export class CreateIncidentDto {
  @ApiProperty({ example: 'INC-2026-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Color deviation in OT-12345' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Detailed description of the issue' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: IncidentPriority, example: IncidentPriority.MEDIUM })
  @IsEnum(IncidentPriority)
  @IsNotEmpty()
  priority: IncidentPriority;

  @ApiProperty({ enum: IncidentType, example: IncidentType.QUALITY })
  @IsEnum(IncidentType)
  @IsNotEmpty()
  type: IncidentType;

  @ApiProperty({ example: 'uuid-ot' })
  @IsUUID()
  @IsOptional()
  work_order_id?: string;

  @ApiProperty({ example: 'uuid-machine' })
  @IsUUID()
  @IsOptional()
  machine_id?: string;

  @ApiProperty({ example: 'uuid-assigned-to' })
  @IsUUID()
  @IsOptional()
  assigned_to_user_id?: string;

  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  reported_at: string;
}

export class CreateCapaActionDto {
  @ApiProperty({ example: 'Detailed action description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: CapaActionType, example: CapaActionType.CORRECTIVE })
  @IsEnum(CapaActionType)
  @IsNotEmpty()
  action_type: CapaActionType;

  @ApiProperty({ example: 'uuid-responsible' })
  @IsUUID()
  @IsNotEmpty()
  responsible_user_id: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  @IsNotEmpty()
  deadline: string;
}

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  @IsNotEmpty()
  status: IncidentStatus;

  @ApiProperty({ example: 'Root cause analysis result' })
  @IsString()
  @IsOptional()
  root_cause?: string;
}

export class UpdateIncidentRootCauseDto {
  @ApiProperty({ example: 'Root cause analysis result' })
  @IsString()
  @IsOptional()
  root_cause?: string;
}
