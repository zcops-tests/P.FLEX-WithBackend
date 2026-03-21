import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
