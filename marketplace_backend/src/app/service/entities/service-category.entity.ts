import { BaseUuidEntity } from 'src/config/database/base-uuid.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Service } from './service.entity';

@Entity('service_category')
export class ServiceCategory extends BaseUuidEntity {
  @Index('idx_service_category_parent_id')
  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Quan hệ phân cấp danh mục Cha - Con
  @ManyToOne(() => ServiceCategory, (cat) => cat.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: ServiceCategory | null;

  @OneToMany(() => ServiceCategory, (cat) => cat.parent)
  children: ServiceCategory[];

  @OneToMany(() => Service, (service) => service.category)
  services: Service[];
}
