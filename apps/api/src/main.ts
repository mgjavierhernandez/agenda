import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = parseInt(config.get<string>('PORT') ?? '3000', 10);
  const corsOrigin = config.get<string>('CORS_ORIGIN');

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((origin) => origin.trim()),
      credentials: true,
    });
  } else {
    app.enableCors({ credentials: true });
  }

  await app.listen(port, '0.0.0.0');
  console.log(`API Agenda Escolar Digital en http://localhost:${port}/api/v1`);
}

void bootstrap();