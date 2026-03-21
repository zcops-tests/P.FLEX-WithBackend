import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDto {
  @ApiProperty({ example: 'work_orders' })
  @IsString()
  @IsNotEmpty()
  entity_name: string;

  @ApiProperty({ example: 'uuid-123' })
  @IsString()
  @IsNotEmpty()
  entity_id: string;

  @ApiProperty({ example: 'PO-1234.pdf', required: false })
  @IsString()
  @IsOptional()
  file_name?: string;
}

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  file_name: string;

  @ApiProperty()
  mime_type: string;

  @ApiProperty()
  size_bytes: string;

  @ApiProperty()
  file_url: string;

  @ApiProperty()
  created_at: Date;
}
