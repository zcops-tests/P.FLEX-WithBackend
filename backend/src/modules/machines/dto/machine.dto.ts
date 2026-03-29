import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'PR-01' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Printing Press 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'PRINT',
    enum: ['PRINT', 'DIECUT', 'REWIND', 'PACKAGING'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'PRINT' | 'DIECUT' | 'REWIND' | 'PACKAGING';

  @ApiProperty({ example: 'uuid-of-area' })
  @IsUUID()
  @IsNotEmpty()
  area_id: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'NO_OPERATOR', 'STOPPED'],
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'NO_OPERATOR' | 'STOPPED';
}

export class UpdateMachineDto {
  @ApiProperty({ example: 'PR-01-UPDATED' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'Printing Press 1 Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'PRINT',
    enum: ['PRINT', 'DIECUT', 'REWIND', 'PACKAGING'],
  })
  @IsString()
  @IsOptional()
  type?: 'PRINT' | 'DIECUT' | 'REWIND' | 'PACKAGING';

  @ApiProperty({ example: 'uuid-of-area' })
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'NO_OPERATOR', 'STOPPED'],
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'NO_OPERATOR' | 'STOPPED';
}
