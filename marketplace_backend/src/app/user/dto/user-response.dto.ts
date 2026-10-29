import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { UserRole } from '../entities/user-role.entity';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  emailVerified: boolean;

  @ApiProperty()
  @Expose()
  @Transform(
    ({ value }: { value: boolean | null | undefined }) => value ?? false,
  )
  isAnonymous: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  image?: string | null;

  @ApiProperty({
    type: [String],
    example: ['customer'],
    description: 'Danh sách quyền của người dùng',
  })
  @Expose()
  @Transform(
    ({ value }: { value?: Array<UserRole | string> | null }): string[] => {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((r) => (typeof r === 'string' ? r : r.role));
    },
  )
  roles: string[];

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  birthday?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  gender?: string | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
