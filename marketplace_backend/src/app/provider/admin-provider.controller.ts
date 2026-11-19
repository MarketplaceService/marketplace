import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
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
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.approve(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin từ chối hồ sơ kèm lý do' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectProviderDto,
  ) {
    return this.providerService.reject(id, dto.reason);
  }
}
