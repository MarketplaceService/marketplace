import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}

