import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class NearbyServicesDto {
  @IsNotEmpty({ message: 'Tọa độ vĩ độ (lat) là bắt buộc' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90, { message: 'Vĩ độ không hợp lệ' })
  @Max(90, { message: 'Vĩ độ không hợp lệ' })
  lat: number;

  @IsNotEmpty({ message: 'Tọa độ kinh độ (lng) là bắt buộc' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180, { message: 'Kinh độ không hợp lệ' })
  @Max(180, { message: 'Kinh độ không hợp lệ' })
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2, { message: 'Bán kính quét tối thiểu là 2km' })
  @Max(20, { message: 'Bán kính quét tối đa là 20km' })
  radius?: number = 5;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Giá tối thiểu không được âm' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Giá tối đa không được âm' })
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Số năm kinh nghiệm không được âm' })
  minExperienceYears?: number;

  @IsOptional()
  @IsIn(['distance', 'rating', 'price'])
  sort?: 'distance' | 'rating' | 'price' = 'distance';
}
