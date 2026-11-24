import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BookingReasonDto {
  @ApiProperty({ description: 'Lý do từ chối hoặc hủy đơn' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do' })
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason: string;
}
