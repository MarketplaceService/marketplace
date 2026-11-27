import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import { AuthGuard } from 'src/core/guards/auth.guard';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import { CreateBookingPaymentDto } from './dto/create-booking-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Thanh toán (payments)')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Khai báo trước :id để "methods" không bị hiểu là id
  @Get('methods')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Danh sách phương thức thanh toán đang bật' })
  getMethods() {
    return this.paymentService.getAvailableMethods();
  }

  @Get(':id')
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Trạng thái giao dịch đọc từ database (dùng để polling)',
  })
  getPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.getPaymentStatus(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Post(':id/sync')
  @HttpCode(200)
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Đồng bộ trạng thái giao dịch với PayOS' })
  syncPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.syncPayment(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }
}

@ApiTags('Thanh toán (payments)')
@Controller('payments/payos')
export class PayosWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Công khai, xác thực bằng chữ ký. Body để kiểu object thường chứ không dùng DTO class:
   * ValidationPipe toàn cục (forbidNonWhitelisted) sẽ chặn hoặc xóa field PayOS thêm sau này,
   * làm chữ ký tính lại không khớp.
   */
  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
  @ApiOperation({ summary: 'Webhook PayOS gọi khi có giao dịch' })
  handleWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentService.handlePayosWebhook(body);
  }
}

@ApiTags('Thanh toán (payments)')
@ApiBearerAuth()
@Controller('bookings/:bookingId/payments')
export class BookingPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Lịch sử giao dịch của đơn đặt lịch' })
  list(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.paymentService.listBookingPayments(bookingId, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Post()
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({ summary: 'Thanh toán lại hoặc đổi phương thức thanh toán' })
  create(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: CreateBookingPaymentDto,
  ) {
    return this.paymentService.createBookingPayment(
      bookingId,
      { id: req.user.id, role: req.user.role },
      dto.paymentMethod,
    );
  }
}
