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
}

export class RejectProviderDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  reason: string;
}

