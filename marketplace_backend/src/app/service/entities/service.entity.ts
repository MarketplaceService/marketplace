import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { PriceUnit } from 'src/shared/types/price-unit.enum';
import { ServiceStatus } from 'src/shared/types/service-status.enum';
import { decimalColumnTransformer } from 'src/shared/utils/decimal-column.transformer';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { ServiceCategory } from './service-category.entity';

@Entity('service')
// Đích của FK ghép FK_booking_provider_service bên booking
@Unique('uq_service_provider_id', ['providerId', 'id'])
@Index('idx_service_provider_list', ['providerId'])
@Index('idx_service_category_status_date', [
  'categoryId',
  'status',
  'createdAt',
])
@Check('chk_service_price_duration', 'base_price >= 0 AND duration_minutes > 0')
export class Service extends BaseUuidEntity {
  @Column({ type: 'uuid', name: 'provider_id' })
  providerId: string;

  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'base_price',
    transformer: decimalColumnTransformer,
  })
  basePrice: number;

  @Column({
    type: 'enum',
    enum: PriceUnit,
    default: PriceUnit.FIXED,
    name: 'price_unit',
  })
  priceUnit: PriceUnit;

  @Column({ type: 'integer', name: 'duration_minutes' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.PENDING,
  })
  status: ServiceStatus;

  // Relations
  @ManyToOne(() => ProviderProfile, (provider) => provider.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;

  @ManyToOne(() => ServiceCategory, (category) => category.services, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: ServiceCategory;
}
