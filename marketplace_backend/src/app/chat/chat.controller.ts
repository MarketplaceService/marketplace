import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import { chatImageFilePipe, chatImageUploadOptions } from './chat-image-upload';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Nhắn tin trực tiếp 1-1 (conversations)')
@ApiBearerAuth()
@Controller('conversations')
@RequireRoles(UserRole.CUSTOMER, UserRole.PROVIDER)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary:
      'Tạo mới hoặc mở lại hội thoại 1-1 theo đơn đặt lịch hoặc trực tiếp',
  })
  createOrGetConversation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createOrGetConversation(req.user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách hội thoại của người dùng hiện tại',
  })
  listConversations(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryConversationsDto,
  ) {
    return this.chatService.listConversations(req.user.id, query);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Lấy lịch sử tin nhắn trong hội thoại theo Cursor Pagination',
  })
  getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.chatService.getMessages(req.user.id, id, query);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Gửi tin nhắn văn bản vào hội thoại (chặn SYSTEM từ client)',
  })
  sendTextMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendTextMessage(req.user.id, id, dto);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary:
      'Đánh dấu đã xem tin nhắn của hội thoại (chỉ tăng tiến last_read_at)',
  })
  markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.markAsRead(req.user.id, id);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', chatImageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Tải lên và gửi ảnh hiện trường sự cố (JPG/PNG/WebP, <= 5MB)',
  })
  sendImageAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(chatImageFilePipe) file: Express.Multer.File,
  ) {
    return this.chatService.sendImageAttachment(req.user.id, id, file);
  }
}
