import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeOptionalDateStringInput } from '../../../../common/utils/date-input.util';

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? undefined : trimmedValue;
};

export class CreateCliseBaseDto {
  @ApiProperty({ example: 'Rack A-1' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @ApiProperty({ example: 'Description of clise' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'Client X' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  cliente?: string;

  @ApiProperty({ example: '72' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  z_value?: string;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  ancho_mm?: number;

  @ApiProperty({ example: 200 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  avance_mm?: number;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  columnas?: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  repeticiones?: number;

  @ApiProperty({ example: 'Estandar A' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  estandar?: string;

  @ApiProperty({ example: 1.14 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  espesor_mm?: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  numero_clises?: number;

  @ApiProperty({ example: '2026-03-22' })
  @Transform(({ value }) => normalizeOptionalDateStringInput(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha_ingreso must be a valid YYYY-MM-DD date',
  })
  @IsOptional()
  fecha_ingreso?: string;

  @ApiProperty({ example: 'Observaciones del clise' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ example: 'FLEXO-01' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  maquina_texto?: string;

  @ApiProperty({ example: 'FF-1020' })
  @Transform(trimOptionalString)
  @IsString()
  @IsOptional()
  ficha_fler?: string;

  @ApiProperty({ example: 12500 })
  @Type(() => Number)
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

export class CreateCliseDto extends CreateCliseBaseDto {
  @ApiProperty({ example: 'CL-1234' })
  @Transform(trimOptionalString)
  @IsString()
  @IsNotEmpty()
  item_code: string;
}

export class UpdateCliseDto extends CreateCliseDto {}

export class BulkUpsertCliseItemDto extends CreateCliseBaseDto {
  @ApiProperty({ example: 'CL-1234', required: false })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  item_code?: string;
}

export class BulkUpsertClisesDto {
  @ApiProperty({ type: () => [BulkUpsertCliseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertCliseItemDto)
  items!: BulkUpsertCliseItemDto[];
}
