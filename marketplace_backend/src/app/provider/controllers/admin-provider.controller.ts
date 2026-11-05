import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminProviderService } from '../services/admin-provider.service';
import { RejectProviderDto } from '../dto/reject-provider.dto';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import { UserRole } from 'src/shared/types/user-role.enum';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';

@ApiTags('Admin - Quản lý & Thẩm định Nhà cung cấp')
@Controller('admin/providers')
@RequireRoles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminProviderController {
  constructor(private readonly adminProviderService: AdminProviderService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Lấy số liệu thống kê hồ sơ Nhà cung cấp (4 Thẻ thống kê)' })
  async getStats() {
    return this.adminProviderService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ Nhà cung cấp chờ duyệt / phân trang / lọc' })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProviders(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminProviderService.getProvidersList({
      status,
      category,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ thẩm định Nhà cung cấp' })
  async getProviderDetail(@Param('id') providerId: string) {
    return this.adminProviderService.getProviderDetail(providerId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin phê duyệt & nâng quyền Nhà cung cấp (S8.2)' })
  async approveProvider(
    @Req() req: AuthenticatedRequest,
    @Param('id') providerId: string,
  ) {
    return this.adminProviderService.approveProvider(req.user!.id, providerId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin từ chối hồ sơ Nhà cung cấp kèm lý do (S8.2)' })
  async rejectProvider(
    @Req() req: AuthenticatedRequest,
    @Param('id') providerId: string,
    @Body() dto: RejectProviderDto,
  ) {
    return this.adminProviderService.rejectProvider(
      req.user!.id,
      providerId,
      dto.reason,
    );
  }
}
