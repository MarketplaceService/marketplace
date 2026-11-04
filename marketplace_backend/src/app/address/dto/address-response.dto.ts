import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AddressResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  fullName: string;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty()
  @Expose()
  addressLine1: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  addressLine2?: string | null;

  @ApiProperty()
  @Expose()
  ward: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  district?: string | null;

  @ApiProperty()
  @Expose()
  city: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  postalCode?: string | null;

  @ApiProperty()
  @Expose()
  latitude: number;

  @ApiProperty()
  @Expose()
  longitude: number;

  @ApiProperty()
  @Expose()
  isDefault: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
