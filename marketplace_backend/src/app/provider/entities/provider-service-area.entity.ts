import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ProviderProfile } from './provider-profile.entity';
import { decimalColumnTransformer } from 'src/shared/utils/decimal-column.transformer';

@Entity()
@Index('idx_service_area_provider_active', ['providerId', 'isActive'])
export class ProviderServiceArea extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  areaName: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    transformer: decimalColumnTransformer,
  })
  centerLatitude: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    transformer: decimalColumnTransformer,
  })
  centerLongitude: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: decimalColumnTransformer,
  })
  radiusKm: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => ProviderProfile, (profile) => profile.serviceAreas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;
}

