import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('conversation_participant')
@Index('uq_conversation_participant', ['conversationId', 'userId'], {
  unique: true,
})
@Index('idx_participant_user_conversation', ['userId', 'conversationId'])
export class ConversationParticipant extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  joinedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
