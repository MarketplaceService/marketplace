import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PriceUnit } from 'src/shared/types/price-unit.enum';

export class InitialServiceDto {
  @ApiProperty({ description: 'Tên dịch vụ khởi tạo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Giá cơ sở (VNĐ)' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ enum: PriceUnit, default: PriceUnit.FIXED })
  @IsEnum(PriceUnit)
  priceUnit: PriceUnit;

  @ApiProperty({ description: 'Thời lượng ước tính (phút)' })
  @IsInt()
  @Min(15)
  durationMinutes: number;
}

export class RegisterDocumentDto {
  @ApiProperty({
    description:
      'Loại tài liệu (ID_CARD_FRONT, ID_CARD_BACK, CERTIFICATE, TOOLKIT_PHOTO)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentType: string;

  @ApiProperty({ description: 'Đường dẫn tệp tài liệu' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class RegisterServiceAreaDto {
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
  isActive?: boolean;
}

export class RegisterProviderDto {
  @ApiProperty({ description: 'Tên hiển thị Nhà cung cấp' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  displayName: string;

  @ApiProperty({ description: 'Số điện thoại nhận việc' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Số năm kinh nghiệm' })
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears: number;

  @ApiProperty({ description: 'Mã danh mục/ngành nghề chính' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Giới thiệu tay nghề' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ type: InitialServiceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialServiceDto)
  initialService?: InitialServiceDto;

  @ApiProperty({ type: [RegisterDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterDocumentDto)
  documents: RegisterDocumentDto[];

  @ApiProperty({ type: RegisterServiceAreaDto })
  @ValidateNested()
  @Type(() => RegisterServiceAreaDto)
  serviceArea: RegisterServiceAreaDto;
}

