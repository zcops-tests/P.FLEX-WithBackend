import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KpiQueryDto {
  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiProperty({ example: 'uuid-machine', required: false })
  @IsUUID()
  @IsOptional()
  machine_id?: string;

  @ApiProperty({ example: 'uuid-area', required: false })
  @IsUUID()
  @IsOptional()
  area_id?: string;
}

export class OeeResponseDto {
  @ApiProperty()
  oee: number;

  @ApiProperty()
  availability: number;

  @ApiProperty()
  performance: number;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  items: any[];
}
