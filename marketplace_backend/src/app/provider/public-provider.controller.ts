import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetProviderReviewsQueryDto } from '../review/dto/query-reviews.dto';
import { ReviewService } from '../review/review.service';
import { ProviderService } from './provider.service';

@ApiTags('Hồ sơ công khai của thợ (providers)')
@Controller('providers')
export class PublicProviderController {
  constructor(
    private readonly providerService: ProviderService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Hồ sơ công khai của một thợ đã được duyệt' })
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.getPublicProfile(id);
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary:
      'Danh sách đánh giá phân trang và ảnh đối chiếu Before/After của thợ',
  })
  getProviderReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetProviderReviewsQueryDto,
  ) {
    return this.reviewService.getProviderReviews(id, query);
  }

  @Get(':id/radar')
  @ApiOperation({
    summary: 'Chỉ số biểu đồ Radar uy tín 5 chiều của thợ (thang 0.0–5.0)',
  })
  getProviderRadar(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.getProviderRadar(id);
  }
}
