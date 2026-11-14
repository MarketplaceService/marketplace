import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

// Một ca làm việc lặp lại hàng tuần, tính theo giờ Việt Nam
@Entity('provider_availability')
@Index('idx_availability_provider_day', [
  'providerId',
  'dayOfWeek',
  'startTime',
])
@Check('chk_provider_availability_day', 'day_of_week BETWEEN 0 AND 6')
@Check('chk_provider_availability_time', 'end_time > start_time')
export class ProviderAvailability extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  // 0 là Chủ Nhật, giống Date.getDay()
  @Column({ type: 'smallint' })
  dayOfWeek: number;

  // Postgres trả kiểu time dưới dạng chuỗi HH:mm:ss
  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => ProviderProfile, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'provider_id',
    foreignKeyConstraintName: 'FK_provider_availability_provider',
  })
  provider: ProviderProfile;
}
