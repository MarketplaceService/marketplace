import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProviderService } from '../services/provider.service';
import { RegisterProviderDto } from '../dto/register-provider.dto';
import { UpdateProviderProfileDto } from '../dto/update-provider-profile.dto';
import {
  CreateServiceAreaDto,
  UpdateServiceAreaDto,
} from '../dto/service-area.dto';
import { CheckServiceAreaDto } from '../dto/check-service-area.dto';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { AuthGuard } from 'src/core/guards/auth.guard';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { ProviderProfileGuard } from '../guards/provider-profile.guard';

@ApiTags('Nhà cung cấp (Provider)')
@Controller()
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post('provider/register')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách hàng gửi hồ sơ đăng ký làm Nhà cung cấp (S8.1)' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterProviderDto,
  ) {
    return this.providerService.register(req.user!, dto);
  }

  @Get('provider/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy hồ sơ Nhà cung cấp của người dùng hiện tại' })
  async getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.providerService.getMyProfile(req.user!.id);
  }

  @Patch('provider/me')
  @UseGuards(AuthGuard, ProviderProfileGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nhà cung cấp cập nhật hồ sơ cá nhân (S11.2)' })
  async updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.providerService.updateMyProfile(req.user!.id, dto);
  }

  @Get('provider/me/documents')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu xác minh của tôi' })
  async getMyDocuments(@Req() req: AuthenticatedRequest) {
    return this.providerService.getMyDocuments(req.user!.id);
  }

  @Post('provider/me/documents')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải lên tài liệu xác minh bổ sung (S11.3)' })
  @HttpCode(HttpStatus.CREATED)
  async addDocument(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.providerService.addDocument(req.user!.id, dto);
  }

  @Get('provider/service-areas')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách khu vực phục vụ của tôi (S12.1)' })
  async getMyServiceAreas(@Req() req: AuthenticatedRequest) {
    return this.providerService.getMyServiceAreas(req.user!.id);
  }

  @Post('provider/service-areas')
  @UseGuards(AuthGuard, ProviderProfileGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm khu vực phục vụ mới (S12.1)' })
  @HttpCode(HttpStatus.CREATED)
  async createServiceArea(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateServiceAreaDto,
  ) {
    return this.providerService.createServiceArea(req.user!.id, dto);
  }

  @Patch('provider/service-areas/:id')
  @UseGuards(AuthGuard, ProviderProfileGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật khu vực phục vụ (S12.1)' })
  async updateServiceArea(
    @Req() req: AuthenticatedRequest,
    @Param('id') areaId: string,
    @Body() dto: UpdateServiceAreaDto,
  ) {
    return this.providerService.updateServiceArea(req.user!.id, areaId, dto);
  }

  @Delete('provider/service-areas/:id')
  @UseGuards(AuthGuard, ProviderProfileGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa khu vực phục vụ (S12.1)' })
  async deleteServiceArea(
    @Req() req: AuthenticatedRequest,
    @Param('id') areaId: string,
  ) {
    return this.providerService.deleteServiceArea(req.user!.id, areaId);
  }

  @Post('provider/service-areas/check')
  @ApiOperation({ summary: 'Kiểm tra tọa độ khách hàng có trong vùng phục vụ (S12.2)' })
  @HttpCode(HttpStatus.OK)
  async checkServiceArea(@Body() dto: CheckServiceAreaDto) {
    return this.providerService.checkServiceArea(dto);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Xem hồ sơ Nhà cung cấp công khai (S11.1)' })
  async getPublicProfile(@Param('id') providerId: string) {
    return this.providerService.getPublicProfile(providerId);
  }
}
