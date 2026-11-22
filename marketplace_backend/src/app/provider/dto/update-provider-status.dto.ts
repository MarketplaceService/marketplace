import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateProviderStatusDto {
  @ApiProperty({
    description: 'Trạng thái sẵn sàng nhận việc của thợ',
    example: true,
  })
  @IsBoolean()
  isOnline: boolean;
}
