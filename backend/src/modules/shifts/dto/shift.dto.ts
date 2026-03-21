import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty({ example: 'MORNING' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '06:00' })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateShiftDto {
  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '06:00' })
  @IsString()
  @IsOptional()
  start_time?: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @IsOptional()
  end_time?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
