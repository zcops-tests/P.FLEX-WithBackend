import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DNI_REGEX, normalizeDni } from '../../../common/utils/dni.util';

export class CreateUserDto {
  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeDni(value))
  @Matches(DNI_REGEX, { message: 'El DNI debe contener al menos 8 digitos numericos.' })
  username: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'uuid-of-role' })
  @IsUUID()
  @IsNotEmpty()
  role_id: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => normalizeDni(value))
  @Matches(DNI_REGEX, { message: 'El DNI debe contener al menos 8 digitos numericos.' })
  username?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'uuid-of-role' })
  @IsUUID()
  @IsOptional()
  role_id?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class IdentifyOperatorDto {
  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeDni(value))
  @Matches(DNI_REGEX, { message: 'El DNI debe contener al menos 8 digitos numericos.' })
  dni: string;
}
