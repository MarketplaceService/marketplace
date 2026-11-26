import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceUnit } from 'src/shared/types/price-unit.enum';

export class DocumentItemDto {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class InitialServiceAreaDto {
  @IsString()
  @IsOptional()
  areaName?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLongitude: number;

  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/** Số dịch vụ tối đa khai khi đăng ký; mọi dịch vụ thuộc ngành nghề chính categoryId */
export const MAX_REGISTER_SERVICES = 5;

export class InitialServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsEnum(PriceUnit)
  priceUnit: PriceUnit;

  @IsNumber()
  @Min(15)
  durationMinutes: number;
}

export class RegisterProviderDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNumber()
  @Min(0)
  @Max(60)
  experienceYears: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  documents: DocumentItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialServiceAreaDto)
  serviceArea?: InitialServiceAreaDto;

  // Bỏ trống thì hệ thống tạo một dịch vụ mặc định theo ngành nghề chính
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_REGISTER_SERVICES)
  @ValidateNested({ each: true })
  @Type(() => InitialServiceDto)
  services?: InitialServiceDto[];

  /**
   * @deprecated Dạng một dịch vụ của frontend cũ, dùng `services`.
   * Vẫn nhận để bản build cũ không bị 400 (ValidationPipe chặn field lạ); bỏ qua khi có `services`.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialServiceDto)
  initialService?: InitialServiceDto;
}
