import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ProviderProfile } from './provider-profile.entity';

@Entity()
@Index('idx_provider_document_list', ['providerId'])
export class ProviderDocument extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'varchar', length: 30 })
  documentType: string;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  // Relations
  @ManyToOne(() => ProviderProfile, (profile) => profile.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;
}

