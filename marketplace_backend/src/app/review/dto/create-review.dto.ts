import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Số sao đánh giá chất lượng dịch vụ (1 đến 5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    typeof obj?.rating === 'number' && Number.isFinite(obj.rating)
      ? obj.rating
      : null,
  )
  @IsInt({ message: 'Điểm sao rating phải là số nguyên từ 1 đến 5' })
  @Min(1, { message: 'Điểm sao rating tối thiểu là 1' })
  @Max(5, { message: 'Điểm sao rating tối đa là 5' })
  rating: number;

  @ApiProperty({
    description: 'Xác nhận chi phí thực tế có đúng với giá niêm yết không',
    example: true,
  })
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    typeof obj?.priceMatched === 'boolean' ? obj.priceMatched : null,
  )
  @IsBoolean({
    message: 'Trường priceMatched là bắt buộc và phải là kiểu boolean',
  })
  priceMatched: boolean;

  @ApiPropertyOptional({
    description: 'Nhận xét của khách hàng về trải nghiệm dịch vụ',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự' })
  @MaxLength(2000, { message: 'Nhận xét tối đa 2000 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  comment?: string;
}
