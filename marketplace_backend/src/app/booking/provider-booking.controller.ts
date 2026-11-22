import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import {
  bookingImageFilePipe,
  bookingSingleImageOptions,
} from './booking-image-upload';
import { BookingService } from './booking.service';
import { BookingReasonDto } from './dto/booking-action.dto';
import {
  GetProviderBookingsQueryDto,
  GetProviderWalletQueryDto,
} from './dto/query-bookings.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';

class UploadInspectionKindQueryDto {
  @IsIn(['before', 'after'])
  kind: 'before' | 'after';
}

@ApiTags('Quản lý đơn & Ví của thợ (provider booking)')
@ApiBearerAuth()
@Controller('provider')
@RequireRoles(UserRole.PROVIDER)
export class ProviderBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('bookings')
  @ApiOperation({ summary: 'Danh sách đơn đặt lịch của nhà cung cấp' })
  getProviderBookings(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetProviderBookingsQueryDto,
  ) {
    return this.bookingService.getProviderBookings(req.user.id, query);
  }

  @Post('bookings/:id/confirm')
  @ApiOperation({ summary: 'Thợ xác nhận nhận đơn (PENDING -> CONFIRMED)' })
  confirmBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingService.confirmBooking(req.user.id, id);
  }

  @Post('bookings/:id/reject')
  @ApiOperation({ summary: 'Thợ từ chối đơn (PENDING -> REJECTED)' })
  rejectBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookingReasonDto,
  ) {
    return this.bookingService.rejectBooking(req.user.id, id, dto.reason);
  }

  @Post('bookings/:id/start')
  @ApiOperation({
    summary: 'Thợ bắt đầu thực hiện công việc (CONFIRMED -> IN_PROGRESS)',
  })
  startBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingService.startBooking(req.user.id, id);
  }

  @Post('bookings/:id/inspection/upload')
  @UseInterceptors(FileInterceptor('image', bookingSingleImageOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Tải 1 ảnh nghiệm thu Before hoặc After lên Storage',
  })
  uploadInspectionImage(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: UploadInspectionKindQueryDto,
    @UploadedFile(bookingImageFilePipe) file: Express.Multer.File,
  ) {
    return this.bookingService.uploadInspectionImage(
      req.user.id,
      id,
      query.kind,
      file,
    );
  }

  @Post('bookings/:id/inspection')
  @ApiOperation({
    summary: 'Nộp hoặc cập nhật biên bản nghiệm thu Before/After',
  })
  submitInspection(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitInspectionDto,
  ) {
    return this.bookingService.submitInspection(req.user.id, id, dto);
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Thống kê ví thu nhập và sao kê giao dịch của thợ' })
  getProviderWallet(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetProviderWalletQueryDto,
  ) {
    return this.bookingService.getProviderWallet(req.user.id, query);
  }
}
