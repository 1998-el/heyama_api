import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';
import express from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: Express;

async function bootstrapApp(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

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

  // initialize WITHOUT app.listen() : Vercel manages the request lifecycle
  await app.init();

  return expressApp;
}

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await bootstrapApp();
  }
  return cachedApp(req, res);
}
