import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsJSON } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCliseDto {
  @ApiProperty({ example: 'CL-1234' })
  @IsString()
  @IsNotEmpty()
  item_code: string;

  @ApiProperty({ example: 'Rack A-1' })
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @ApiProperty({ example: 'Description of clise' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'Client X' })
  @IsString()
  @IsOptional()
  cliente?: string;

  @ApiProperty({ example: '72' })
  @IsString()
  @IsOptional()
  z_value?: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @IsOptional()
  ancho_mm?: number;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @IsOptional()
  avance_mm?: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @IsOptional()
  columnas?: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsOptional()
  repeticiones?: number;

  @ApiProperty({ example: 1.14 })
  @IsNumber()
  @IsOptional()
  espesor_mm?: number;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  @IsOptional()
  fecha_ingreso?: string;
}

export class UpdateCliseDto extends CreateCliseDto {}
