import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const USER_GENDERS = ['male', 'female', 'other'] as const;

export class UpdateProfileDto {
  @ApiProperty({ required: false, maxLength: 100 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, nullable: true, example: '0912345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s.-]{8,20}$/)
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '1995-08-20' })
  @IsOptional()
  @IsDateString({ strict: true })
  birthday?: string | null;

  @ApiProperty({ required: false, nullable: true, enum: USER_GENDERS })
  @IsOptional()
  @IsIn(USER_GENDERS)
  gender?: (typeof USER_GENDERS)[number] | null;
}
