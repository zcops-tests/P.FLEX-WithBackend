import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty({ example: 'PRINTING' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Printing Department' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Main printing floor' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateAreaDto {
  @ApiProperty({ example: 'Printing Department' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
