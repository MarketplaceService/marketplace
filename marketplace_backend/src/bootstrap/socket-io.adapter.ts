import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from 'nestjs-pino';
import type { ServerOptions } from 'socket.io';
import { APP_CONFIG } from 'src/config/app/app.config';

export class CorsSocketIoAdapter extends IoAdapter {
  private readonly allowList: string[];

  constructor(
    app: INestApplicationContext,
    config: ConfigService,
    private readonly appLogger: Logger,
  ) {
    super(app);
    const appCfg = config.getOrThrow<{ corsOrigins: string[] }>(APP_CONFIG);
    this.allowList = appCfg.corsOrigins;
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const corsOptions: ServerOptions['cors'] = {
      origin: (
        requestOrigin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!requestOrigin || this.allowList.includes(requestOrigin)) {
          callback(null, true);
          return;
        }

        this.appLogger.warn(
          `Socket.IO CORS: blocked origin ${requestOrigin} (not in allowList)`,
        );
        callback(null, false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    };

    const server: unknown = super.createIOServer(port, {
      ...options,
      cors: corsOptions,
    });
    return server;
  }
}
