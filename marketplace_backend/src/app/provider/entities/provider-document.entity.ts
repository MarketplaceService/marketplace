import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ProviderProfile } from './provider-profile.entity';

@Entity('provider_document')
export class ProviderDocument extends BaseUuidEntity {
  @Index('idx_provider_document_list')
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

  @ManyToOne(() => ProviderProfile, (provider) => provider.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;
}

