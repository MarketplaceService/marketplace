import { Controller, Get, HttpCode, HttpStatus, Req } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { User } from '../user/entities/user.entity';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { ResEx } from 'src/swagger/response-examples';
import { SessionAuthService } from './session-auth/session-auth.service';
import { UserService } from '../user/user.service';

@ApiTags('Xác thực (auth)')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionAuthService: SessionAuthService,
    private readonly userService: UserService,
  ) {}

  private mapUserResponse(user: User) {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  private async sessionFromRequest(req: {
    headers: Record<string, string | string[] | undefined>;
  }) {
    const ctx = await this.sessionAuthService.resolveSessionContext(
      req.headers,
    );

    if (!ctx) return null;

    return {
      user: this.mapUserResponse(ctx.user),
      session: {
        token: ctx.session.token,
        expiresAt: ctx.session.expiresAt,
      },
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin người dùng hiện tại (session)',
    operationId: 'auth_get_me',
  })
  @ApiOkResponse({
    description:
      'Ví dụ khi đã đăng nhập; khi không có session trả authenticated: false',
    schema: {
      example: ResEx.auth.me,
    },
  })
  @ApiBearerAuth()
  async getCurrentUser(@Req() req: any) {
    const session = await this.sessionFromRequest(req);

    if (!session?.user) {
      return {
        success: false,
        authenticated: false,
        message: 'Not authenticated',
        user: null,
      };
    }

    const fullUser = await this.userService.getUser(session.user.id);

    return {
      success: true,
      authenticated: true,
      user: fullUser ? this.mapUserResponse(fullUser) : session.user,
    };
  }

  @Get('session')
  @ApiOperation({
    summary: 'Lấy session (token, hết hạn, user)',
    operationId: 'auth_get_session',
  })
  @ApiOkResponse({
    description: 'Ví dụ khi có session',
    schema: {
      example: ResEx.auth.session,
    },
  })
  @ApiBearerAuth()
  async getSession(@Req() req: any) {
    const session = await this.sessionFromRequest(req);
    if (!session?.session) {
      return {
        success: false,
        authenticated: false,
      };
    }

    return {
      success: true,
      authenticated: true,
      session: {
        token: session.session.token,
        expiresAt: session.session.expiresAt,
      },
      user: session.user,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('check')
  @ApiOperation({
    summary: 'Kiểm tra đã đăng nhập hay chưa',
    operationId: 'auth_check',
  })
  @ApiOkResponse({
    description: 'Ví dụ khi phản hồi',
    schema: {
      example: ResEx.auth.check,
    },
  })
  @ApiBearerAuth()
  async checkAuth(@Req() req: any) {
    const session = await this.sessionFromRequest(req);

    if (!session?.user) {
      return {
        authenticated: false,
        user: null,
      };
    }

    return {
      authenticated: true,
      user: session.user,
    };
  }
}
