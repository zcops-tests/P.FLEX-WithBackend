import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAreaDto {
  @ApiProperty({ example: 'uuid-of-area' })
  @IsUUID()
  @IsNotEmpty()
  area_id: string;
}
