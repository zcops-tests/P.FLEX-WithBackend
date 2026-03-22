import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncPullRequestDto {
  @ApiProperty({ example: '2026-03-22T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  last_changed_at: string;

  @ApiPropertyOptional({ example: '0' })
  @Matches(/^\d+$/)
  @IsOptional()
  last_id?: string;

  @ApiPropertyOptional({ example: 'PRINT_STATION' })
  @IsString()
  @IsOptional()
  device_profile?: string;

  @ApiPropertyOptional({ example: 1000, minimum: 1, maximum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  batch_size?: number;

  @ApiPropertyOptional({ example: ['areas', 'machines', 'work_orders'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}

export class SyncMutationDto {
  @ApiProperty({ example: 'mut-12345' })
  @IsString()
  @IsNotEmpty()
  mutation_id: string;

  @ApiProperty({ example: 'POST' })
  @IsIn(['POST', 'PUT', 'PATCH', 'DELETE'])
  @IsNotEmpty()
  method: string;

  @ApiProperty({ example: '/api/v1/production/printing/reports' })
  @IsString()
  @Matches(/^\/?api\/v\d+\//)
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ example: { id: 'uuid', field: 'value' } })
  @IsObject()
  @IsNotEmpty()
  payload: any;

  @ApiProperty({ example: '2026-03-22T10:00:00Z' })
  @IsDateString()
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
