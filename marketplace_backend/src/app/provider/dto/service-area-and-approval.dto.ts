import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CheckServiceAreaDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  centerLatitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  centerLongitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(20)
  radiusKm?: number;
}

export class RejectProviderDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  reason: string;
}

