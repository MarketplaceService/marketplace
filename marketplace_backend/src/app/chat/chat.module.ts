import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { ProviderProfile } from '../provider/entities/provider-profile.entity';
import { StorageModule } from '../storage/storage.module';
import { User } from '../user/entities/user.entity';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { ChatService } from './chat.service';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      Booking,
      ProviderProfile,
      User,
    ]),
    StorageModule,
  ],
  controllers: [ChatController],
  providers: [ChatRealtimePublisher, ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
