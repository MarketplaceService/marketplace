import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { avatarFilePipe, avatarUploadOptions } from './avatar-upload';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@ApiTags('Người dùng (users)')
@ApiBearerAuth()
@Controller('users')
@RequireRoles(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.PROVIDER)
export class UserController {
  constructor(private readonly userService: UserService) {}

  private mapProfile(user: User) {
    return plainToInstance(ProfileResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Get('me')
  @ApiOperation({
    summary: 'Xem hồ sơ cá nhân',
    operationId: 'users_get_me',
  })
  @ApiOkResponse({ schema: { example: ResEx.user.profile } })
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.mapProfile(req.user);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Chỉnh sửa hồ sơ cá nhân',
    operationId: 'users_update_me',
  })
  @ApiOkResponse({ schema: { example: ResEx.user.profile } })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    return this.mapProfile(
      await this.userService.updateProfile(req.user.id, body),
    );
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  @ApiOperation({
    summary: 'Tải ảnh đại diện (JPG hoặc PNG, tối đa 2MB)',
    operationId: 'users_upload_avatar',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ schema: { example: ResEx.user.profile } })
  async uploadAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(avatarFilePipe) file: Express.Multer.File,
  ) {
    return this.mapProfile(
      await this.userService.updateAvatar(req.user.id, file),
    );
  }

  @Delete('me')
  @ApiOperation({
    summary: 'Xóa mềm tài khoản',
    operationId: 'users_delete_me',
  })
  @ApiOkResponse({ schema: { example: { success: true } } })
  async deleteAccount(@Req() req: AuthenticatedRequest) {
    await this.userService.softDeleteAccount(req.user.id);
    return { success: true };
  }
}
