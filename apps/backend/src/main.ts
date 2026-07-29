import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  const corsOrigin = configService.get<string>('CORS_ORIGIN', '');
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('E-Shop Aggregator API')
    .setDescription('Aggregator backend API')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup ignores app.setGlobalPrefix — mount the full path.
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));

  await app.listen(configService.get<number>('PORT', 3000));
}
void bootstrap();
