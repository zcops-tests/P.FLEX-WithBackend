import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsJSON, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RackType {
  CLISE = 'CLISE',
  DIE = 'DIE',
}

export enum RackOrientation {
  VERTICAL = 'VERTICAL',
  HORIZONTAL = 'HORIZONTAL',
}

export class CreateRackConfigDto {
  @ApiProperty({ example: 'RACK-A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: RackType, example: RackType.CLISE })
  @IsEnum(RackType)
  @IsNotEmpty()
  rack_type: RackType;

  @ApiProperty({ enum: RackOrientation, example: RackOrientation.VERTICAL })
  @IsEnum(RackOrientation)
  @IsNotEmpty()
  orientation: RackOrientation;

  @ApiProperty({ example: { levels: 5, slots_per_level: 10 } })
  @IsNotEmpty()
  levels_json: any;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateRackConfigDto extends CreateRackConfigDto {}

export class CreateCliseDieLinkDto {
  @ApiProperty({ example: 'uuid-clise' })
  @IsString()
  @IsNotEmpty()
  clise_id: string;

  @ApiProperty({ example: 'uuid-die' })
  @IsString()
  @IsNotEmpty()
  die_id: string;
}
