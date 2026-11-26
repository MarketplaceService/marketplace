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

  // Tên FK khớp với tên viết tay trong migration CreateBookingTables,
  // để migration:generate không đề xuất xóa rồi tạo lại
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_booking_customer',
  })
  customer: User;

  @ManyToOne(() => ProviderProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'provider_id',
    foreignKeyConstraintName: 'FK_booking_provider',
  })
  provider: ProviderProfile;

  // Composite FK ties the booked provider to the actual service owner.
  // Ref: booking.(provider_id, service_id) > service.(provider_id, id)
  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'provider_id',
      referencedColumnName: 'providerId',
      foreignKeyConstraintName: 'FK_booking_provider_service',
    },
    {
      name: 'service_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_booking_provider_service',
    },
  ])
  service: Service;

  @ManyToOne(() => Address, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'address_id',
    foreignKeyConstraintName: 'FK_booking_address',
  })
  address: Address;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'cancelled_by',
    foreignKeyConstraintName: 'FK_booking_cancelled_by',
  })
  cancelledByUser: User | null;

  @OneToMany(() => BookingStatusHistory, (history) => history.booking)
  statusHistories: BookingStatusHistory[];
}
