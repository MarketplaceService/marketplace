import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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
    description: 'Phương thức thanh toán (chừa sẵn cho module thanh toán)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  paymentMethod?: string;
}
