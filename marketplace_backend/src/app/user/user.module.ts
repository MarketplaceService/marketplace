import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { AnonymousUserCleanupService } from './anonymous-user-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, AnonymousUserCleanupService],
  exports: [UserService],
})
export class UserModule {}
