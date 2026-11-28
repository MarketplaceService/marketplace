import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import {
  bookingInitialImagesOptions,
  MAX_INITIAL_BOOKING_IMAGES,
} from './booking-image-upload';
import { CreateReviewDto } from '../review/dto/create-review.dto';
import { ReviewService } from '../review/review.service';
import { BookingService } from './booking.service';
import { BookingReasonDto } from './dto/booking-action.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PreviewBookingDto } from './dto/preview-booking.dto';
import { GetMyBookingsQueryDto } from './dto/query-bookings.dto';

@ApiTags('Đặt lịch & Nghiệm thu (bookings)')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly reviewService: ReviewService,
  ) {}

  @Post('preview')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({
    summary: 'Xem trước bảng tính giá và kiểm tra hợp lệ đặt lịch',
  })
  previewBooking(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PreviewBookingDto,
  ) {
    return this.bookingService.previewBooking(req.user.id, dto);
  }

  @Post('initial-images')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @UseInterceptors(
    FilesInterceptor(
      'images',
      MAX_INITIAL_BOOKING_IMAGES,
      bookingInitialImagesOptions,
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Tải tối đa 3 ảnh hiện trạng ban đầu khi đặt lịch' })
  uploadInitialImages(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.bookingService.uploadInitialImages(req.user.id, files);
  }

  @Post()
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({ summary: 'Tạo đơn đặt lịch mới (giữ chỗ PENDING)' })
  createBooking(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(req.user.id, dto);
  }

  @Get('my')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({ summary: 'Danh sách đơn đặt lịch của tôi (khách hàng)' })
  getMyBookings(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetMyBookingsQueryDto,
  ) {
    return this.bookingService.getMyBookings(req.user.id, query);
  }

  @Get(':id')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Chi tiết đơn đặt lịch, lịch sử và biên bản nghiệm thu',
  })
  getBookingDetail(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingService.getBookingDetail(
      { id: req.user.id, role: req.user.role },
      id,
    );
  }

  @Post(':id/complete')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({
    summary: 'Khách hàng xác nhận nghiệm thu Before/After & hoàn tất đơn',
  })
  completeBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingService.completeBooking(req.user.id, id);
  }

  @Post(':id/cancel')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Hủy đơn đặt lịch (chỉ cho phép ở PENDING / CONFIRMED)',
  })
  cancelBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookingReasonDto,
  ) {
    return this.bookingService.cancelBooking(
      { id: req.user.id, role: req.user.role },
      id,
      dto.reason,
    );
  }

  @Post(':id/reviews')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({
    summary: 'Khách hàng đánh giá chất lượng dịch vụ sau khi hoàn thành đơn',
  })
  createReview(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(req.user.id, id, dto);
  }

  @Patch(':id/reviews')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({
    summary: 'Khách hàng chỉnh sửa đánh giá đã gửi cho đơn hàng hoàn thành',
  })
  updateReview(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.updateReview(req.user.id, id, dto);
  }
}
