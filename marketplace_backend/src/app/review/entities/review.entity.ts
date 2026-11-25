import { Booking } from 'src/app/booking/entities/booking.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Check, Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity('review')
@Check('chk_review_rating', 'rating BETWEEN 1 AND 5')
export class Review extends BaseUuidEntity {
  @Column({ type: 'uuid', unique: true })
  bookingId: string;

  @Column({ type: 'integer' })
  rating: number;

  @Column({ type: 'boolean' })
  priceMatched: boolean;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @OneToOne(() => Booking, (booking) => booking.review, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;
}
