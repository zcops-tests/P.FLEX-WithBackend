import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeOptionalDateStringInput } from '../../../common/utils/date-input.util';

export enum WorkOrderStatus {
  IMPORTED = 'IMPORTED',
  PLANNED = 'PLANNED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WorkOrderManagementExitAction {
  REMOVE_ONLY = 'REMOVE_ONLY',
  CLEAR_PLANT_ENTRY = 'CLEAR_PLANT_ENTRY',
  REVERT_TO_IMPORTED = 'REVERT_TO_IMPORTED',
}

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'OT-12345' })
  @IsString()
  @IsNotEmpty()
  ot_number: string;

  @ApiPropertyOptional({ example: WorkOrderStatus.IMPORTED, enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  @IsOptional()
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ example: 'Labels for Client X' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'COT-999' })
  @IsString()
  @IsOptional()
  nro_cotizacion?: string;

  @ApiPropertyOptional({ example: 'FICHA-123' })
  @IsString()
  @IsOptional()
  nro_ficha?: string;

  @ApiPropertyOptional({ example: 'PED-555' })
  @IsString()
  @IsOptional()
  pedido?: string;

  @ApiPropertyOptional({ example: 'PO-888' })
  @IsString()
  @IsOptional()
  orden_compra?: string;

  @ApiPropertyOptional({ example: 'Client ABC S.A.' })
  @IsString()
  @IsOptional()
  cliente_razon_social?: string;

  @ApiPropertyOptional({ example: 'John Seller' })
  @IsString()
  @IsOptional()
  vendedor?: string;

  @ApiPropertyOptional({ example: '2026-03-22' })
  @Transform(({ value }) => normalizeOptionalDateStringInput(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha_pedido must be a valid YYYY-MM-DD date' })
  @IsOptional()
  fecha_pedido?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @Transform(({ value }) => normalizeOptionalDateStringInput(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha_entrega must be a valid YYYY-MM-DD date' })
  @IsOptional()
  fecha_entrega?: string;

  @ApiPropertyOptional({ example: '2026-03-24' })
  @Transform(({ value }) => normalizeOptionalDateStringInput(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha_ingreso_planta must be a valid YYYY-MM-DD date' })
  @IsOptional()
  fecha_ingreso_planta?: string;

  @ApiPropertyOptional({ example: '2026-03-25' })
  @Transform(({ value }) => normalizeOptionalDateStringInput(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha_programada_produccion must be a valid YYYY-MM-DD date' })
  @IsOptional()
  fecha_programada_produccion?: string;

  @ApiPropertyOptional({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  cantidad_pedida?: number;

  @ApiPropertyOptional({ example: 'UNIDADES' })
  @IsString()
  @IsOptional()
  unidad?: string;

  @ApiPropertyOptional({ example: 'BOPP Transparente' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiPropertyOptional({ example: 150.5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  ancho_mm?: number;

  @ApiPropertyOptional({ example: 200 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  avance_mm?: number;

  @ApiPropertyOptional({ example: 450.25 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  desarrollo_mm?: number;

  @ApiPropertyOptional({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  columnas?: number;

  @ApiPropertyOptional({ example: 'Hot Melt' })
  @IsString()
  @IsOptional()
  adhesivo?: string;

  @ApiPropertyOptional({ example: 'Barniz UV' })
  @IsString()
  @IsOptional()
  acabado?: string;

  @ApiPropertyOptional({ example: 'TRQ-1001' })
  @IsString()
  @IsOptional()
  troquel?: string;

  @ApiPropertyOptional({ example: 'IMP-01' })
  @IsString()
  @IsOptional()
  maquina_texto?: string;

  @ApiPropertyOptional({ example: 12000.5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  total_metros?: number;

  @ApiPropertyOptional({ example: 4500.75 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  total_m2?: number;

  @ApiPropertyOptional({ example: 'Observación de diseño' })
  @IsString()
  @IsOptional()
  observaciones_diseno?: string;

  @ApiPropertyOptional({ example: 'Observación comercial' })
  @IsString()
  @IsOptional()
  observaciones_cotizacion?: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  raw_payload?: Record<string, unknown>;
}

export class BulkUpsertWorkOrdersDto {
  @ApiProperty({ type: [CreateWorkOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderDto)
  items: CreateWorkOrderDto[];
}

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  @IsNotEmpty()
  status: WorkOrderStatus;
}

export class ExitWorkOrderManagementDto {
  @ApiProperty({ enum: WorkOrderManagementExitAction })
  @IsEnum(WorkOrderManagementExitAction)
  @IsNotEmpty()
  exit_action: WorkOrderManagementExitAction;
}
