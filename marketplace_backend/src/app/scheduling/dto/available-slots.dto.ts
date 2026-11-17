import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export const SLOT_DURATIONS = [60, 90] as const;

export class AvailableSlotsQueryDto {
  @ApiProperty({ example: '2026-11-20', description: 'Ngày theo giờ Việt Nam' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có dạng YYYY-MM-DD' })
  date: string;

  @ApiProperty({ required: false, enum: SLOT_DURATIONS, default: 60 })
  @IsOptional()
  @IsIn(SLOT_DURATIONS)
  durationMinutes?: number;
}
