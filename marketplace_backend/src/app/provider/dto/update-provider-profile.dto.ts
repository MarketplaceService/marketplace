import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ description: 'Tên hiển thị Nhà cung cấp' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại nhận việc' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Số năm kinh nghiệm' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Mã danh mục/ngành nghề chính' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Giới thiệu tay nghề' })
  @IsOptional()
  @IsString()
  bio?: string;
}

