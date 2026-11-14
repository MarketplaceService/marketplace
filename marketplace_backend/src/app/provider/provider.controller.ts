import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import { CheckServiceAreaDto } from './dto/service-area-and-approval.dto';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { UpdateServiceAreaDto } from './dto/update-service-area.dto';
import { ProviderService } from './provider.service';

@ApiTags('Đối tác / Thợ (provider)')
@Controller('provider')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get('me')
  @ApiBearerAuth()
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy hồ sơ đối tác của người dùng hiện tại' })
  async getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.providerService.getMyProfile(req.user.id);
  }

  @Post('register')
  @ApiBearerAuth()
  @RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiOperation({ summary: 'Đăng ký trở thành Nhà cung cấp (KYC)' })
  async register(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterProviderDto,
  ) {
    return this.providerService.register(req.user.id, dto);
  }

  @Patch('service-area')
  @ApiBearerAuth()
  @RequireRoles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Sửa tâm và bán kính vùng phục vụ của thợ' })
  async updateServiceArea(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateServiceAreaDto,
  ) {
    return this.providerService.updateMyServiceArea(req.user.id, dto);
  }

  @Post('service-areas/check')
  @ApiOperation({
    summary: 'Kiểm tra tọa độ khách hàng có nằm trong vùng phục vụ (Haversine)',
  })
  async checkServiceArea(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CheckServiceAreaDto,
  ) {
    return this.providerService.checkServiceArea(dto, req.user?.id);
  }
}

