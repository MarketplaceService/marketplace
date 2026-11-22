import { Address } from 'src/app/address/entities/address.entity';
import { ProviderProfile } from 'src/app/provider/entities/provider-profile.entity';
import { Service } from 'src/app/service/entities/service.entity';
import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { decimalColumnTransformer } from 'src/shared/utils/decimal-column.transformer';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type {
  BookingAddressSnapshot,
  BookingInspectionData,
} from '../booking.types';
import { BookingStatusHistory } from './booking-status-history.entity';

@Entity('booking')
@Index('idx_booking_customer_recent', ['customerId', 'createdAt'])
@Index('idx_booking_provider_schedule', ['providerId', 'scheduledStartAt'])
@Index('idx_booking_provider_recent', ['providerId', 'createdAt'])
@Index('idx_booking_service', ['serviceId'])
@Index('idx_booking_address', ['addressId'])
@Check(
  'chk_booking_schedule_price',
  'scheduled_end_at > scheduled_start_at AND total_price >= 0',
)
export class Booking extends BaseUuidEntity {
  @Column({ type: 'varchar', length: 30, unique: true })
  bookingCode: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'uuid' })
  serviceId: string;

  @Column({ type: 'uuid' })
  addressId: string;

  @Column({ type: 'timestamptz' })
  scheduledStartAt: Date;

  @Column({ type: 'timestamptz' })
  scheduledEndAt: Date;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalColumnTransformer,
  })
  totalPrice: number;

  @Column({ type: 'varchar', length: 200 })
  serviceTitleSnapshot: string;

  @Column({ type: 'jsonb' })
  serviceAddressSnapshot: BookingAddressSnapshot;

  @Column({ type: 'jsonb', nullable: true })
  inspectionImages: BookingInspectionData | null;

  @Column({ type: 'text', nullable: true })
  customerNote: string | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'uuid', nullable: true })
  cancelledBy: string | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => ProviderProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @ManyToOne(() => Address, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelled_by' })
  cancelledByUser: User | null;

  @OneToMany(() => BookingStatusHistory, (history) => history.booking)
  statusHistories: BookingStatusHistory[];
}
