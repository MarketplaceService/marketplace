import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { PaymentMethod } from 'src/shared/types/payment-method.enum';

export const CUSTOMER_BOOKING_TABS = [
  'all',
  'pending',
  'active',
  'completed',
  'cancelled',
] as const;

export const PROVIDER_BOOKING_TABS = [
  'all',
  'today',
  'pending',
  'confirmed',
  'in_progress',
  'active',
  'completed',
  'cancelled',
] as const;

export class GetMyBookingsQueryDto {
  @ApiPropertyOptional({ enum: CUSTOMER_BOOKING_TABS })
  @IsOptional()
  @IsIn(CUSTOMER_BOOKING_TABS)
  tab?: (typeof CUSTOMER_BOOKING_TABS)[number];

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class GetProviderBookingsQueryDto {
  @ApiPropertyOptional({ enum: PROVIDER_BOOKING_TABS })
  @IsOptional()
  @IsIn(PROVIDER_BOOKING_TABS)
  tab?: (typeof PROVIDER_BOOKING_TABS)[number];

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo ngày YYYY-MM-DD (giờ Việt Nam)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class GetProviderWalletQueryDto {
  @ApiPropertyOptional({
    description: 'Tháng cần xem sao kê, định dạng YYYY-MM',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Chỉ lấy đơn đã thanh toán bằng phương thức này',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
