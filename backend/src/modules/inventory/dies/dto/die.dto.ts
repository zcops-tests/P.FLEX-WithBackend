import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDieBaseDto {
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

  @ApiProperty({ example: 4 })
  @IsNumber()
  @IsOptional()
  ancho_plg?: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @IsOptional()
  avance_plg?: number;

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

  @ApiProperty({ example: 'Observaciones del troquel' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  @IsOptional()
  fecha_ingreso?: string;

  @ApiProperty({ example: 'PB-01' })
  @IsString()
  @IsOptional()
  pb?: string;

  @ApiProperty({ example: '12 mm' })
  @IsString()
  @IsOptional()
  separacion_avance?: string;

  @ApiProperty({ example: 'OPERATIVE' })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  cantidad?: number;

  @ApiProperty({ example: 'Rack D-1' })
  @IsString()
  @IsOptional()
  almacen?: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @IsOptional()
  metros_acumulados?: number;

  @ApiProperty({ example: 'Rotativo' })
  @IsString()
  @IsOptional()
  tipo_troquel?: string;

  @ApiProperty({
    example: { cliente_original: 'ACME', medida_original: '100 x 50' },
  })
  @IsObject()
  @IsOptional()
  raw_payload?: Record<string, unknown>;
}

export class CreateDieDto extends CreateDieBaseDto {
  @ApiProperty({ example: 'SERIE-001' })
  @IsString()
  @IsNotEmpty()
  serie: string;
}

export class UpdateDieDto extends CreateDieDto {}

export class BulkUpsertDieItemDto extends CreateDieBaseDto {
  @ApiProperty({ example: 'SERIE-001', required: false })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue === '' ? undefined : trimmedValue;
  })
  @IsOptional()
  @IsString()
  serie?: string;
}

export class BulkUpsertDiesDto {
  @ApiProperty({ type: () => [BulkUpsertDieItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertDieItemDto)
  items!: BulkUpsertDieItemDto[];
}
