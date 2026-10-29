import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { setUpApp } from './bootstrap/setup-app';
import { NestExpressApplication } from '@nestjs/platform-express';
import { APP_CONFIG } from './config/app/app.config';
import { setUpSwagger } from './bootstrap/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const appCfg = config.getOrThrow<{ PORT: number }>(APP_CONFIG);
  const logger = app.get(Logger);

  setUpApp(app, logger, config);
  setUpSwagger(app);

  const port = appCfg.PORT;
  await app.listen(port);

  logger.log(`Application is running on port ${port}`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/docs`,
  );
}
void bootstrap().catch((error) => {
  console.log('bootstrap failed: ', error);
  process.exit(1);
});
