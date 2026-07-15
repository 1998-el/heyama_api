import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: Express;

async function bootstrapApp(): Promise<Express> {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api');

  // on initialise SANS app.listen() : Vercel gère le cycle de vie de la fonction
  await app.init();

  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await bootstrapApp();
  }
  // l'instance Express générée par Nest est elle-même un handler (req, res)
  return cachedApp(req, res);
}
