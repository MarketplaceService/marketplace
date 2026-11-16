import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ServiceCategory } from '../service/entities/service-category.entity';
import { Service } from '../service/entities/service.entity';
import { User } from '../user/entities/user.entity';
import { AdminProviderController } from './admin-provider.controller';
import { ProviderDocument } from './entities/provider-document.entity';
import { ProviderProfile } from './entities/provider-profile.entity';
import { ProviderServiceArea } from './entities/provider-service-area.entity';
import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderProfile,
      ProviderDocument,
      ProviderServiceArea,
      Service,
      ServiceCategory,
      User,
    ]),
    AuthModule,
  ],
  controllers: [ProviderController, AdminProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}

