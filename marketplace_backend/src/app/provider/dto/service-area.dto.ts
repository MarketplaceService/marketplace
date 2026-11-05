import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceAreaDto {
  @ApiPropertyOptional({ description: 'Tên gợi nhớ vùng' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  areaName?: string;

  @ApiProperty({ description: 'Vĩ độ tâm' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLatitude: number;

  @ApiProperty({ description: 'Kinh độ tâm' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLongitude: number;

  @ApiProperty({ description: 'Bán kính hoạt động (km)', minimum: 2, maximum: 20 })
  @IsNumber()
  @Min(2)
  @Max(20)
  radiusKm: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceAreaDto {
  @ApiPropertyOptional({ description: 'Tên gợi nhớ vùng' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  areaName?: string;

  @ApiPropertyOptional({ description: 'Vĩ độ tâm' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLatitude?: number;

  @ApiPropertyOptional({ description: 'Kinh độ tâm' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLongitude?: number;

  @ApiPropertyOptional({
    description: 'Bán kính hoạt động (km)',
    minimum: 2,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(20)
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

