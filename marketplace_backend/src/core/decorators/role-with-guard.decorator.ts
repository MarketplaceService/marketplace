import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from 'src/shared/types/user-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/role.guard';
import { Roles } from './role.decorator';

export function RequireRoles(...roles: UserRole[]) {
  return applyDecorators(Roles(...roles), UseGuards(AuthGuard, RolesGuard));
}
