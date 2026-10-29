import cookieParse from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { APP_CONFIG } from 'src/config/app/app.config';

export function setUpApp(
  app: NestExpressApplication,
  logger: Logger,
  config: ConfigService,
) {
  //COOKIEPARSE
  app.use(cookieParse());

  const appCfg = config.getOrThrow<{ corsOrigins: string[] }>(APP_CONFIG);
  const allowList = appCfg.corsOrigins;
  //CORS
  app.enableCors({
    origin: (requestOrigin: string, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (allowList.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      //!log warning
      logger.warn(
        `CORS: blocked request from origin ${requestOrigin} (not in allowList)`,
      );

      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: true,
  });

  //PIPE
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //là danh sách những trường dữ liệu được phép tồn tại, nếu được bật lên true thì khi client gửi những dữ liệu không có trong dto nest js sẽ tự loại bỏ trường đó trước khi chạm tới controller
      forbidNonWhitelisted: true, //khi bật true lên thì sẽ trả ra lỗi và đưa ra những trường không được gửi lên
      transform: true, //sẽ chuyển đổi kiểu dữ liệu dựa trên kiểu dữ liệu mà mình khai báo
      transformOptions: { enableImplicitConversion: true }, //cho phép nest tự suy luận kiểu dữ liệu và chuyển đổi tự động ngay cả khi không sử dụng decorator để khai báo kiểu
    }),
  );

  //API VERSIONING
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableShutdownHooks();
}
