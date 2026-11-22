import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
  IsNumber,
  Min,
} from 'class-validator';

export class InspectionPhotoDto {
  @ApiProperty({ description: 'URL ảnh đã tải lên' })
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(1000)
  url: string;

  @ApiPropertyOptional({ description: 'Chú thích ngắn cho ảnh' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  caption?: string;

  @ApiProperty({
    description: 'Thời điểm chụp/tải ảnh (ISO 8601)',
    example: '2026-11-22T09:30:00.000Z',
  })
  @IsISO8601()
  capturedAt: string;
}

export class TechnicalSpecItemDto {
  @ApiProperty({ description: 'Tên thông số kiểm tra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  label: string;

  @ApiProperty({ description: 'Giá trị đo thực tế' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  value: string;

  @ApiPropertyOptional({ description: 'Đánh giá trạng thái' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  status?: string;
}

export class ExtraMaterialItemDto {
  @ApiProperty({ description: 'Tên vật tư/linh kiện phát sinh tham khảo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name: string;

  @ApiProperty({ description: 'Số lượng' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Đơn giá tham khảo (VND)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Lý do đối chiếu theo ảnh Before' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason: string;
}

export class SubmitInspectionDto {
  @ApiProperty({
    description: 'Danh sách ảnh trước khi sửa (tối thiểu 1 ảnh)',
    type: [InspectionPhotoDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => InspectionPhotoDto)
  before: InspectionPhotoDto[];

  @ApiProperty({
    description: 'Danh sách ảnh sau khi sửa (tối thiểu 1 ảnh)',
    type: [InspectionPhotoDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => InspectionPhotoDto)
  after: InspectionPhotoDto[];

  @ApiPropertyOptional({
    description: 'Danh sách thông số kiểm tra kỹ thuật',
    type: [TechnicalSpecItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TechnicalSpecItemDto)
  technicalSpecs?: TechnicalSpecItemDto[];

  @ApiPropertyOptional({
    description: 'Vật tư phát sinh tham khảo (không tự cộng vào total_price)',
    type: [ExtraMaterialItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExtraMaterialItemDto)
  extraMaterials?: ExtraMaterialItemDto[];

  @ApiPropertyOptional({ description: 'Ghi chú hiện trường của thợ' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fieldNote?: string;
}
