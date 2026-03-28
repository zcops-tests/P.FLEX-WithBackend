import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Supervisor de Planta' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Acceso operativo a supervision y control de reportes.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['dashboard.view', 'reports.print.view'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permission_codes?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Supervisor de Planta' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Acceso operativo a supervision y control de reportes.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['dashboard.view', 'reports.print.view'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permission_codes?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
