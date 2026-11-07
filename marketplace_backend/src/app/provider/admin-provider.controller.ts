import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import { RejectProviderDto } from './dto/service-area-and-approval.dto';
import { ProviderService } from './provider.service';

@ApiTags('Quản trị - Duyệt Thợ (admin/providers)')
@ApiBearerAuth()
@RequireRoles(UserRole.ADMIN)
@Controller('admin/providers')
export class AdminProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin lấy danh sách hồ sơ Thợ chờ duyệt & thống kê',
  })
  async list(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.providerService.listForAdmin({
      search,
      category,
      status,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin lấy chi tiết hồ sơ thẩm định của Thợ' })
  async getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.getDetailForAdmin(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Admin phê duyệt hồ sơ và nâng quyền Thợ' })
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.providerService.approve(req.user.id, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin từ chối hồ sơ kèm lý do' })
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectProviderDto,
  ) {
    return this.providerService.reject(req.user.id, id, dto.reason);
  }
}
