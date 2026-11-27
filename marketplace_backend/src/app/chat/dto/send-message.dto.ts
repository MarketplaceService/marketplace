import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn văn bản (1 - 2000 ký tự)',
    maxLength: 2000,
  })
  @IsString()
  content: string;

  // Khai báo optional để service có thể chủ động chặn và trả 403 nếu client cố gửi messageType = SYSTEM
  @ApiPropertyOptional({
    description: 'Chỉ chấp nhận TEXT từ client; gửi SYSTEM sẽ bị chặn 403',
  })
  @IsOptional()
  @IsString()
  messageType?: string;

  @ApiPropertyOptional({
    description: 'ID tạm phía client để khử trùng lặp optimistic UI',
  })
  @IsOptional()
  @IsString()
  clientTempId?: string;
}
