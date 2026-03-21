import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WorkOrderStatus {
  IMPORTED = 'IMPORTED',
  PLANNED = 'PLANNED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'OT-12345' })
  @IsString()
  @IsNotEmpty()
  ot_number: string;

  @ApiProperty({ example: 'Labels for Client X' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'COT-999' })
  @IsString()
  @IsOptional()
  nro_cotizacion?: string;

  @ApiProperty({ example: 'FICHA-123' })
  @IsString()
  @IsOptional()
  nro_ficha?: string;

  @ApiProperty({ example: 'PED-555' })
  @IsString()
  @IsOptional()
  pedido?: string;

  @ApiProperty({ example: 'PO-888' })
  @IsString()
  @IsOptional()
  orden_compra?: string;

  @ApiProperty({ example: 'Client ABC S.A.' })
  @IsString()
  @IsOptional()
  cliente_razon_social?: string;

  @ApiProperty({ example: 'John Seller' })
  @IsString()
  @IsOptional()
  vendedor?: string;

  @ApiProperty({ example: '2026-03-22' })
  @IsDateString()
  @IsOptional()
  fecha_pedido?: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  @IsOptional()
  fecha_entrega?: string;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @IsOptional()
  cantidad_pedida?: number;

  @ApiProperty({ example: 'UNIDADES' })
  @IsString()
  @IsOptional()
  unidad?: string;

  @ApiProperty({ example: 'BOPP Transparente' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @IsOptional()
  ancho_mm?: number;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @IsOptional()
  avance_mm?: number;
}

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  @IsNotEmpty()
  status: WorkOrderStatus;
}
