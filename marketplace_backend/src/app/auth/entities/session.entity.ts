import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Session extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @Index('idx_session_expires')
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  //Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
