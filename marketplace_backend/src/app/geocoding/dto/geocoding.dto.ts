import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class AutocompleteQueryDto {
  @ApiProperty({ example: '123 Nguyễn Huệ' })
  @IsString()
  @Length(2, 200)
  input: string;

  @ApiProperty({
    required: false,
    description: 'Vĩ độ để ưu tiên kết quả gần đó',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({
    required: false,
    description: 'Kinh độ để ưu tiên kết quả gần đó',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class PlaceParamsDto {
  @ApiProperty()
  @IsString()
  @Length(1, 300)
  placeId: string;
}

export class GeocodeQueryDto {
  @ApiProperty({ example: '123 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh' })
  @IsString()
  @Length(3, 300)
  address: string;
}

export class ReverseGeocodeQueryDto {
  @ApiProperty({ example: 10.7745 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 106.7034 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}
