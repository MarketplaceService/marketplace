import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { InternalEmailController } from './email.controller';
import { InternalSecretGuard } from 'src/core/guards/internal-secret.guard';
// import { ConfigModule } from '@nestjs/config';

@Module({
  // imports: [ConfigModule],
  controllers: [InternalEmailController],
  providers: [EmailService, InternalSecretGuard],
  exports: [EmailService],
})
export class EmailModule {}
