import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// Bắt buộc ghi múi giờ để server không phải đoán giờ địa phương của trình duyệt
const WITH_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/;
const TIMEZONE_MESSAGE = 'Thời điểm phải kèm múi giờ, ví dụ +07:00';

export class CreateTimeOffDto {
  @ApiProperty({ example: '2026-11-20T08:00:00+07:00' })
  @IsISO8601({ strict: true })
  @Matches(WITH_TIMEZONE, { message: TIMEZONE_MESSAGE })
  startAt: string;

  @ApiProperty({ example: '2026-11-20T12:00:00+07:00' })
  @IsISO8601({ strict: true })
  @Matches(WITH_TIMEZONE, { message: TIMEZONE_MESSAGE })
  endAt: string;

  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do nghỉ' })
  @MaxLength(255)
  reason: string;
}

export class TimeOffResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  startAt: Date;

  @ApiProperty()
  @Expose()
  endAt: Date;

  @ApiProperty()
  @Expose()
  reason: string;
}
