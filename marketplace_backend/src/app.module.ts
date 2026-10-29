import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { allConfig } from './config/configuration';
import { PinoLoggerModule } from './config/logger/logger.module';
import { AppThrottlerModule } from './config/throttler/throttler.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './config/database/typeorm-config.service';
import { CorrelationIdMiddleware } from './core/middlewares/correlation-id.middleware';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AllExceptionFilter } from './core/filters/all-exceptions.filter';
import { UserModule } from './app/user/user.module';
import { AuthModule } from './app/auth/auth.module';
import { EmailModule } from './app/email/email.module';

const envFile =
  process.env.NODE_ENV === 'production'
    ? ['.env.prod', '.env']
    : ['.env.dev', '.env'];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Khai báo để các hàm module khác có thể truy cập được mà không cần khai báo lại vào import
      cache: true, // Lưu vào bộ nhớ đệm các file đọc được
      validate: validateEnv,
      envFilePath: envFile,
      load: allConfig,
    }),
    PinoLoggerModule,
    AppThrottlerModule,
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    UserModule,
    AuthModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*path');
  }
}
