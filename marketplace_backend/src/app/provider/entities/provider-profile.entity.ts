import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProviderDocument } from './provider-document.entity';
import { ProviderServiceArea } from './provider-service-area.entity';

@Entity('provider_profile')
@Index('idx_provider_review_queue', ['verificationStatus', 'createdAt'])
@Check('chk_provider_profile_experience_years', 'experience_years >= 0')
export class ProviderProfile extends BaseUuidEntity {
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 150 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'integer', nullable: true })
  experienceYears: number | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  categoryId: string | null;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Index('idx_provider_approved_by')
  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // Relations
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver: User | null;

  @OneToMany(() => ProviderDocument, (doc) => doc.provider)
  documents: ProviderDocument[];

  @OneToMany(() => ProviderServiceArea, (area) => area.provider)
  serviceAreas: ProviderServiceArea[];
}

