import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { DATABASE_CONFIG } from './database.config';
import { Injectable } from '@nestjs/common';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbConfig =
      this.config.getOrThrow<TypeOrmModuleOptions>(DATABASE_CONFIG);

    const isDev = this.config.get('NODE_ENV') === 'development';

    return {
      ...dbConfig,
      autoLoadEntities: true,
      synchronize: false,
      logging: isDev ? ['error', 'warn', 'query'] : ['error'],
      migrationsRun: false,
      retryAttempts: 5, // thử lại tối đa 5 lần khi kết nối hụt
      retryDelay: 3000, // Mỗi lần thử lại cách 3s
      namingStrategy: new SnakeNamingStrategy(),
    };
  }
}
