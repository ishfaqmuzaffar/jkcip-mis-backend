import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const fixedOrigins = [
    'https://mis.jkcip.jk.gov.in',
    'http://72.60.28.22:8080',
    'http://localhost:8080',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const isLocalDevOrigin =
        origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

      if (fixedOrigins.includes(origin) || isLocalDevOrigin) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3002, '0.0.0.0');
  console.log('Backend running on http://0.0.0.0:3002/api');
}

bootstrap();
