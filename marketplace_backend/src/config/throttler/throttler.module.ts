import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { THROTTLER_COFIG } from './throttler.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = config.getOrThrow<{ ttl: number; limit: number }>(
          THROTTLER_COFIG,
        );

        return {
          throttlers: [
            {
              name: 'default',
              ttl: cfg.ttl,
              limit: cfg.limit,
            },
          ],
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}
