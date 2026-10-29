import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setUpSwagger(app: NestExpressApplication): void {
  //   if (process.env.NODE_ENV === 'production') return;
  const config = new DocumentBuilder()
    .setTitle('Ecommerce API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
}
