import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('booking_status_history')
@Index('idx_booking_status_timeline', ['bookingId', 'createdAt'])
export class BookingStatusHistory extends BaseUuidEntity {
  @Column({ type: 'uuid' })
  bookingId: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    nullable: true,
  })
  oldStatus: BookingStatus | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
  })
  newStatus: BookingStatus;

  @Column({ type: 'uuid', nullable: true })
  changedBy: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @ManyToOne(() => Booking, (booking) => booking.statusHistories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'booking_id',
    foreignKeyConstraintName: 'FK_booking_status_history_booking',
  })
  booking: Booking;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'changed_by',
    foreignKeyConstraintName: 'FK_booking_status_history_changed_by',
  })
  changedByUser: User | null;
}
