import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CheckServiceAreaDto {
  @ApiProperty({ description: 'ID của Nhà cung cấp cần kiểm tra' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Vĩ độ địa chỉ khách hàng' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Kinh độ địa chỉ khách hàng' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

