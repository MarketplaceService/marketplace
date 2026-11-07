import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import { ResEx } from 'src/swagger/response-examples';
import { AddressService } from './address.service';
import { AddressResponseDto } from './dto/address-response.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';

@ApiTags('Địa chỉ (addresses)')
@ApiBearerAuth()
@Controller('addresses')
@RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  private mapAddress(address: Address | Address[]) {
    return plainToInstance(AddressResponseDto, address, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách địa chỉ của tôi',
    operationId: 'addresses_list',
  })
  @ApiOkResponse({ schema: { example: [ResEx.address.item] } })
  async list(@Req() req: AuthenticatedRequest) {
    return this.mapAddress(await this.addressService.list(req.user.id));
  }

  @Post()
  @ApiOperation({ summary: 'Thêm địa chỉ', operationId: 'addresses_create' })
  @ApiCreatedResponse({ schema: { example: ResEx.address.item } })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateAddressDto,
  ) {
    return this.mapAddress(await this.addressService.create(req.user.id, body));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa địa chỉ', operationId: 'addresses_update' })
  @ApiOkResponse({ schema: { example: ResEx.address.item } })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.mapAddress(
      await this.addressService.update(req.user.id, id, body),
    );
  }

  @Patch(':id/default')
  @ApiOperation({
    summary: 'Đặt địa chỉ mặc định',
    operationId: 'addresses_set_default',
  })
  @ApiOkResponse({ schema: { example: ResEx.address.item } })
  async setDefault(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mapAddress(
      await this.addressService.setDefault(req.user.id, id),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm địa chỉ', operationId: 'addresses_remove' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressService.remove(req.user.id, id);
    return { success: true };
  }
}
