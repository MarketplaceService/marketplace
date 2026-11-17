import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/guards/auth.guard';
import {
  AutocompleteQueryDto,
  GeocodeQueryDto,
  PlaceParamsDto,
  ReverseGeocodeQueryDto,
} from './dto/geocoding.dto';
import { GeocodingService } from './geocoding.service';

// Bắt đăng nhập để người ngoài không dùng hết quota MapVina của dự án
@ApiTags('Tìm địa chỉ (geocoding)')
@ApiBearerAuth()
@Controller('geocoding')
@UseGuards(AuthGuard)
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('autocomplete')
  @ApiOperation({ summary: 'Gợi ý địa chỉ khi đang gõ' })
  autocomplete(@Query() query: AutocompleteQueryDto) {
    const near =
      query.lat !== undefined && query.lng !== undefined
        ? { latitude: query.lat, longitude: query.lng }
        : undefined;
    return this.geocodingService.autocomplete(query.input, near);
  }

  @Get('places/:placeId')
  @ApiOperation({ summary: 'Tọa độ và đơn vị hành chính của một gợi ý' })
  placeDetail(@Param() params: PlaceParamsDto) {
    return this.geocodingService.placeDetail(params.placeId);
  }

  @Get('geocode')
  @ApiOperation({ summary: 'Tìm tọa độ khớp nhất với một địa chỉ' })
  geocode(@Query() query: GeocodeQueryDto) {
    return this.geocodingService.geocode(query.address);
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Địa chỉ tại một tọa độ' })
  reverse(@Query() query: ReverseGeocodeQueryDto) {
    return this.geocodingService.reverse(query.lat, query.lng);
  }
}
