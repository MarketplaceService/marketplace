import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsUUID } from 'class-validator';

export class PreviewBookingDto {
  @ApiProperty({ description: 'ID dịch vụ được chọn' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ description: 'ID địa chỉ khách hàng' })
  @IsUUID()
  addressId: string;

  @ApiProperty({
    description: 'Thời điểm bắt đầu khung giờ hẹn (ISO 8601)',
    example: '2026-11-22T09:00:00+07:00',
  })
  @IsISO8601()
  scheduledStartAt: string;
}
