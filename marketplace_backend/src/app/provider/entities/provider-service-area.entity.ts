import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { decimalColumnTransformer } from 'src/shared/utils/decimal-column.transformer';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ProviderProfile } from './provider-profile.entity';

const coordinateColumn = {
  type: 'decimal' as const,
  precision: 10,
  scale: 7,
  transformer: decimalColumnTransformer,
};

const radiusColumn = {
  type: 'decimal' as const,
  precision: 6,
  scale: 2,
  transformer: decimalColumnTransformer,
};

@Entity('provider_service_area')
@Index('idx_service_area_provider_active', ['providerId', 'isActive'])
@Check('chk_provider_service_area_radius', 'radius_km > 0')
export class ProviderServiceArea extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'varchar', nullable: true })
  areaName: string | null;

  @Column(coordinateColumn)
  centerLatitude: number;

  @Column(coordinateColumn)
  centerLongitude: number;

  @Column(radiusColumn)
  radiusKm: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => ProviderProfile, (provider) => provider.serviceAreas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;
}

