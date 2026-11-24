import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { MessageType } from 'src/shared/types/message-type.enum';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('message')
@Index('idx_message_conversation_cursor', ['conversationId', 'createdAt', 'id'])
export class Message extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    enumName: 'message_type',
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: 'text' })
  content: string;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;
}
