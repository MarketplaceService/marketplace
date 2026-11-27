import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'UUID của đơn đặt lịch để mở hội thoại gắn theo đơn',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'UUID tài khoản người nhận cho hội thoại trực tiếp',
  })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional({
    description: 'UUID hồ sơ nhà cung cấp cho hội thoại tư vấn trực tiếp',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
