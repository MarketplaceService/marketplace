import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import { UserRole as UserRoleEnum } from 'src/shared/types/user-role.enum';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('user_role')
@Unique('uq_user_role_user_role', ['userId', 'role'])
export class UserRole extends BaseUuidEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_user_role_role')
  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    enumName: 'user_role_enum',
    default: UserRoleEnum.CUSTOMER,
  })
  role: UserRoleEnum;
}
