import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum StockStatus {
  LIBERATED = 'LIBERATED',
  QUARANTINE = 'QUARANTINE',
  RETAINED = 'RETAINED',
  DISPATCHED = 'DISPATCHED',
}

export class CreateStockItemDto {
  @ApiProperty({ example: 'uuid-ot', required: false })
  @IsString()
  @IsOptional()
  work_order_id?: string;

  @ApiProperty({ example: 'OT-12345', required: false })
  @IsString()
  @IsOptional()
  ot_number_snapshot?: string;

  @ApiProperty({ example: 'Client ABC', required: false })
  @IsString()
  @IsOptional()
  client_snapshot?: string;

  @ApiProperty({ example: 'Product XYZ', required: false })
  @IsString()
  @IsOptional()
  product_snapshot?: string;

  @ApiProperty({ example: 5000, required: false })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ example: '100 x 200' })
  @IsString()
  @IsOptional()
  medida?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsOptional()
  ancho_mm?: number;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @IsOptional()
  avance_mm?: number;

  @ApiProperty({ example: 'Papel Couche' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @IsOptional()
  columnas?: number;

  @ApiProperty({ example: 'Horizontal' })
  @IsString()
  @IsOptional()
  prepicado?: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @IsOptional()
  cantidad_x_rollo?: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @IsOptional()
  cantidad_millares?: number;

  @ApiProperty({ example: 'Etiqueta Premium' })
  @IsString()
  @IsOptional()
  etiqueta?: string;

  @ApiProperty({ example: 'Rectangular' })
  @IsString()
  @IsOptional()
  forma?: string;

  @ApiProperty({ example: 'Autoadhesivo' })
  @IsString()
  @IsOptional()
  tipo_producto?: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @IsOptional()
  caja?: string;

  @ApiProperty({ example: 'A-01-01' })
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @ApiProperty({ enum: StockStatus, default: StockStatus.QUARANTINE })
  @IsEnum(StockStatus)
  @IsOptional()
  status?: StockStatus;

  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  entry_date: string;

  @ApiProperty({ example: 'Observaciones' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateStockItemDto extends CreateStockItemDto {}

export class UpdateStockStatusDto {
  @ApiProperty({ enum: StockStatus })
  @IsEnum(StockStatus)
  @IsNotEmpty()
  status: StockStatus;
}

export class BulkCreateStockItemsDto {
  @ApiProperty({ type: [CreateStockItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockItemDto)
  items: CreateStockItemDto[];
}

export class BulkUpsertStockItemsDto {
  @ApiProperty({ type: [CreateStockItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockItemDto)
  items: CreateStockItemDto[];
}
