import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { AnonymousUserCleanupService } from './anonymous-user-cleanup.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [UserController],
  providers: [UserService, AnonymousUserCleanupService],
  exports: [UserService],
})
export class UserModule {}
