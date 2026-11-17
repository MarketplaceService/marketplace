import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('provider_time_off')
@Index('idx_time_off_provider_start', ['providerId', 'startAt'])
@Check('chk_provider_time_off_range', 'end_at > start_at')
export class ProviderTimeOff extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz' })
  endAt: Date;

  // Lý do chỉ thợ thấy, không trả ra hồ sơ công khai
  @Column({ type: 'text' })
  reason: string;

  @ManyToOne(() => ProviderProfile, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'provider_id',
    foreignKeyConstraintName: 'FK_provider_time_off_provider',
  })
  provider: ProviderProfile;
}
