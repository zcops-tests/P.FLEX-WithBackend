import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsArray, IsObject, ValidateNested } from 'class-validator';
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

  @ApiProperty({ example: 'Estandar A' })
  @IsString()
  @IsOptional()
  estandar?: string;

  @ApiProperty({ example: 1.14 })
  @IsNumber()
  @IsOptional()
  espesor_mm?: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsOptional()
  numero_clises?: number;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  @IsOptional()
  fecha_ingreso?: string;

  @ApiProperty({ example: 'Observaciones del clise' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ example: 'FLEXO-01' })
  @IsString()
  @IsOptional()
  maquina_texto?: string;

  @ApiProperty({ example: 'FF-1020' })
  @IsString()
  @IsOptional()
  ficha_fler?: string;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @IsOptional()
  metros_acumulados?: number;

  @ApiProperty({ example: ['CYAN', 'MAGENTA'] })
  @IsArray()
  @IsOptional()
  colores_json?: string[];

  @ApiProperty({ example: { medidas: '250 x 330', troquel: 'TR-100' } })
  @IsObject()
  @IsOptional()
  raw_payload?: Record<string, unknown>;
}

export class UpdateCliseDto extends CreateCliseDto {}

export class BulkUpsertClisesDto {
  @ApiProperty({ type: () => [CreateCliseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCliseDto)
  items!: CreateCliseDto[];
}
