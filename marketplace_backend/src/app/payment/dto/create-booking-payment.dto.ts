import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaymentMethod } from 'src/shared/types/payment-method.enum';

export class CreateBookingPaymentDto {
  @ApiProperty({
    enum: PaymentMethod,
    description:
      'Phương thức của lần thanh toán mới (hiện hỗ trợ cod và payos)',
  })
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: PaymentMethod;
}
