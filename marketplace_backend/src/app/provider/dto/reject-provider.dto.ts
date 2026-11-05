import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectProviderDto {
  @ApiProperty({ description: 'Lý do từ chối hồ sơ' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do từ chối hồ sơ' })
  @MaxLength(1000)
  reason: string;
}

