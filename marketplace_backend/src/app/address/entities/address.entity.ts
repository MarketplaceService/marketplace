import { User } from 'src/app/user/entities/user.entity';
import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { decimalColumnTransformer } from 'src/shared/utils/decimal-column.transformer';
import {
  Check,
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

const coordinateColumn = {
  type: 'decimal' as const,
  precision: 10,
  scale: 7,
  transformer: decimalColumnTransformer,
};

@Entity()
@Index('uq_address_default_active', ['userId'], {
  unique: true,
  where: 'is_default = true AND deleted_at IS NULL',
})
@Check('chk_address_latitude', 'latitude BETWEEN -90 AND 90')
@Check('chk_address_longitude', 'longitude BETWEEN -180 AND 180')
export class Address extends BaseUuidEntity {
  @Index('idx_address_user_list')
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  addressLine1: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100 })
  ward: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @Column(coordinateColumn)
  latitude: number;

  @Column(coordinateColumn)
  longitude: number;

  @Column({ default: false })
  isDefault: boolean;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  //Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
