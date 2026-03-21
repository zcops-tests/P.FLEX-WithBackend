import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDieDto {
  @ApiProperty({ example: 'SERIE-001' })
  @IsString()
  @IsNotEmpty()
  serie: string;

  @ApiProperty({ example: '100x50' })
  @IsString()
  @IsOptional()
  medida?: string;

  @ApiProperty({ example: 'Rack D-1' })
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsOptional()
  ancho_mm?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsOptional()
  avance_mm?: number;

  @ApiProperty({ example: '72' })
  @IsString()
  @IsOptional()
  z_value?: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @IsOptional()
  columnas?: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsOptional()
  repeticiones?: number;

  @ApiProperty({ example: 'BOPP' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({ example: 'RECTANGULAR' })
  @IsString()
  @IsOptional()
  forma?: string;

  @ApiProperty({ example: 'Client Y' })
  @IsString()
  @IsOptional()
  cliente?: string;

  @ApiProperty({ example: 'OPERATIVE' })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  cantidad?: number;
}

export class UpdateDieDto extends CreateDieDto {}
