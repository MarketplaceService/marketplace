import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryConversationsDto {
  @ApiPropertyOptional({ enum: ['all', 'unread'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'unread'])
  filter?: 'all' | 'unread';

  @ApiPropertyOptional({
    description: 'Từ khóa tìm theo tên đối tác, mã đơn hoặc tên dịch vụ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: ['all', 'customer', 'provider'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'customer', 'provider'])
  scope?: 'all' | 'customer' | 'provider';
}
