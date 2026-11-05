import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderProfile } from './entities/provider-profile.entity';
import { ProviderDocument } from './entities/provider-document.entity';
import { ProviderServiceArea } from './entities/provider-service-area.entity';
import { User } from '../user/entities/user.entity';
import { ProviderService } from './services/provider.service';
import { AdminProviderService } from './services/admin-provider.service';
import { ProviderController } from './controllers/provider.controller';
import { AdminProviderController } from './controllers/admin-provider.controller';
import { ProviderProfileGuard } from './guards/provider-profile.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderProfile,
      ProviderDocument,
      ProviderServiceArea,
      User,
    ]),
  ],
  controllers: [ProviderController, AdminProviderController],
  providers: [ProviderService, AdminProviderService, ProviderProfileGuard],
  exports: [ProviderService, AdminProviderService, ProviderProfileGuard],
})
export class ProviderModule {}

