import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { LoggerModule } from 'nestjs-pino';
import { CORRELATION_ID_HEADER } from 'src/shared/constants/correlation-id';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info', //Mức độ log
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true, // Hiện log trên 1 dòng
                    translateTime: 'SYS:standard', // Hiện log theo thời gian thực
                    ignore: 'pid,hostname', // Bỏ các trường không cần thiết
                  },
                }
              : undefined, //Cách log hiển thị
            // todo: thêm reqId
            genReqId: (req, res) => {
              const existing = req.headers[CORRELATION_ID_HEADER];
              const id = existing ?? randomUUID();
              req.headers[CORRELATION_ID_HEADER] = id;
              res.setHeader(CORRELATION_ID_HEADER, id);
              return id;
            },
            redact: {
              //Che những thông tin nhạy cảm
              paths: [
                'req.headers.authorization',
                'req.headers.cookies',
                'req.body.password',
                'req.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
            customProps: (req: IncomingMessage) => ({
              // Bổ sung thêm thông tin cho log
              userId: (req as IncomingMessage & { user?: { id: string } }).user
                ?.id,
            }),
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class PinoLoggerModule {}
