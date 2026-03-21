import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'jdoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
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
