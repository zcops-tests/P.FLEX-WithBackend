import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { DNI_REGEX, normalizeDni } from '../../../common/utils/dni.util';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeDni(value))
  @Matches(DNI_REGEX, {
    message: 'El DNI debe contener al menos 8 digitos numericos.',
  })
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  deviceType?: string; // e.g., MOBILE, TABLET, DESKTOP

  @IsOptional()
  @IsString()
  deviceProfile?: string; // e.g., PRINT_STATION, DIECUT_STATION
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
