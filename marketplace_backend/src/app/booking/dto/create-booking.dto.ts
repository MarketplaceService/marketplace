import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from 'src/shared/types/payment-method.enum';
import { PreviewBookingDto } from './preview-booking.dto';
import { InspectionPhotoDto } from './submit-inspection.dto';

export class CreateBookingDto extends PreviewBookingDto {
  @ApiPropertyOptional({ description: 'Ghi chú hiện trạng thiết bị của khách' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  customerNote?: string;

  @ApiPropertyOptional({
    description: 'Ảnh hiện trạng ban đầu khách đính kèm (tối đa 3 ảnh)',
    type: [InspectionPhotoDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => InspectionPhotoDto)
  initialImages?: InspectionPhotoDto[];

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description:
      'Phương thức thanh toán, hiện hỗ trợ cod và payos. Bỏ trống thì dùng cod',
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod?: PaymentMethod;
}
