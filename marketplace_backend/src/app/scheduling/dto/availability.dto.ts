import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Giờ phải có dạng HH:mm';

export class AvailabilityBlockDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 là Chủ Nhật' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime: string;

  @ApiProperty({ example: '17:30' })
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReplaceAvailabilityDto {
  @ApiProperty({ type: [AvailabilityBlockDto] })
  @IsArray()
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityBlockDto)
  blocks: AvailabilityBlockDto[];
}

export class UpdateAvailabilityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, example: '08:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime?: string;

  @ApiProperty({ required: false, example: '17:30' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime?: string;
}

// Postgres trả kiểu time dạng HH:mm:ss, API chỉ dùng HH:mm
const toHourMinute = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.slice(0, 5) : value;

export class AvailabilityResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ description: '0 là Chủ Nhật' })
  @Expose()
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @Expose()
  @Transform(toHourMinute)
  startTime: string;

  @ApiProperty({ example: '17:30' })
  @Expose()
  @Transform(toHourMinute)
  endTime: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;
}
