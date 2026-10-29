import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity()
export class Verification extends BaseUuidEntity {
  @Index('idx_verification_identifier')
  @Column({ type: 'text' })
  identifier: string;

  @Column({ type: 'text' })
  value: string;

  @Index('idx_verification_expires')
  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
