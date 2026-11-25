import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type {
  NotificationReferenceType,
  NotificationType,
} from '../notification.types';

@Entity('notification')
@Index('idx_notification_user_feed', ['userId', 'createdAt', 'id'])
@Index('idx_notification_unread_feed', ['userId', 'createdAt', 'id'], {
  where: 'read_at IS NULL',
})
@Check('chk_notification_type', "type IN ('BOOKING', 'MESSAGE', 'SYSTEM')")
@Check(
  'chk_notification_reference_type',
  "reference_type IS NULL OR reference_type IN ('BOOKING', 'CONVERSATION', 'PROVIDER_PROFILE', 'REPORT')",
)
export class Notification extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  referenceType: NotificationReferenceType | null;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
