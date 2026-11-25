import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import { GetNotificationsQueryDto } from './dto/query-notifications.dto';
import { NotificationService } from './notification.service';

@ApiTags('Thông báo (notifications)')
@ApiBearerAuth()
@RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo cá nhân & tổng số lượng chưa đọc',
  })
  getMyNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationService.getMyNotifications(req.user.id, query);
  }

  // Khai báo route tĩnh 'read-all' TRƯỚC route động ':id/read' để tránh trùng khớp :id
  @Patch('read-all')
  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo của tài khoản hiện tại là đã đọc',
  })
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Đánh dấu một thông báo cụ thể là đã đọc (idempotent)',
  })
  markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markAsRead(req.user.id, id);
  }
}
