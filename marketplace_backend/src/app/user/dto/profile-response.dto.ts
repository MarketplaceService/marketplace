import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProfileResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  image?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  birthday?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  gender?: string | null;

  @ApiProperty()
  @Expose()
  role: string;
}
