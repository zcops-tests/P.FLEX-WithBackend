import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsJSON, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SyncPullRequestDto {
  @ApiProperty({ example: '2026-03-22T10:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  last_changed_at: string;

  @ApiProperty({ example: '0' })
  @IsString()
  @IsOptional()
  last_id?: string;

  @ApiProperty({ example: 'PRINT_STATION', required: false })
  @IsString()
  @IsOptional()
  device_profile?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @IsOptional()
  batch_size?: number;

  @ApiProperty({ example: ['areas', 'machines', 'work_orders'] })
  @IsArray()
  @IsOptional()
  scopes?: string[];
}

export class SyncMutationDto {
  @ApiProperty({ example: 'mut-12345' })
  @IsString()
  @IsNotEmpty()
  mutation_id: string;

  @ApiProperty({ example: 'POST' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ example: '/api/v1/production/printing/reports' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ example: { id: 'uuid', field: 'value' } })
  @IsNotEmpty()
  payload: any;

  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsString()
  @IsNotEmpty()
  client_timestamp: string;
}

export class SyncPushRequestDto {
  @ApiProperty({ type: [SyncMutationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncMutationDto)
  mutations: SyncMutationDto[];

  @ApiProperty({ example: 'device-id-123' })
  @IsString()
  @IsNotEmpty()
  device_id: string;
}

export class SyncPullResponseDto {
  @ApiProperty()
  items: any[];

  @ApiProperty()
  new_cursor: {
    last_changed_at: string;
    last_id: string;
  };

  @ApiProperty()
  has_more: boolean;
}
