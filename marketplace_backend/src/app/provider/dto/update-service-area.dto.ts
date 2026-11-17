import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateServiceAreaDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  areaName?: string;

  @ApiProperty({ example: 21.0368 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLatitude: number;

  @ApiProperty({ example: 105.7826 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLongitude: number;

  @ApiProperty({ minimum: 2, maximum: 20, example: 10 })
  @IsNumber()
  @Min(2)
  @Max(20)
  radiusKm: number;
}
