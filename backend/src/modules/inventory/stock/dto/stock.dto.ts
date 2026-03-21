import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StockStatus {
  LIBERATED = 'LIBERATED',
  QUARANTINE = 'QUARANTINE',
  RETAINED = 'RETAINED',
  DISPATCHED = 'DISPATCHED',
}

export class CreateStockItemDto {
  @ApiProperty({ example: 'uuid-ot' })
  @IsUUID()
  @IsOptional()
  work_order_id?: string;

  @ApiProperty({ example: 'OT-12345' })
  @IsString()
  @IsOptional()
  ot_number_snapshot?: string;

  @ApiProperty({ example: 'Client ABC' })
  @IsString()
  @IsOptional()
  client_snapshot?: string;

  @ApiProperty({ example: 'Product XYZ' })
  @IsString()
  @IsOptional()
  product_snapshot?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'UNIDADES' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsOptional()
  rolls?: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsOptional()
  millares?: number;

  @ApiProperty({ example: 'A-01-01' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ enum: StockStatus, default: StockStatus.LIBERATED })
  @IsEnum(StockStatus)
  @IsOptional()
  status?: StockStatus;

  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  entry_date: string;

  @ApiProperty({ example: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'PALLET-001' })
  @IsString()
  @IsOptional()
  pallet_id?: string;
}

export class UpdateStockItemDto extends CreateStockItemDto {}

export class UpdateStockStatusDto {
  @ApiProperty({ enum: StockStatus })
  @IsEnum(StockStatus)
  @IsNotEmpty()
  status: StockStatus;
}
