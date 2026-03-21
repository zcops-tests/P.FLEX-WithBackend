import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
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
