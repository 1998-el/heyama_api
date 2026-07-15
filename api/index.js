require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const { AppModule } = require('../dist/app.module');

let cachedApp;

async function bootstrapApp() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  const defaultOrigins = [
    'https://heyama-portal.vercel.app',
    'http://localhost:3000',
    'https://heyama-dek9bcaw1-charly-pierre-mounkams-projects.vercel.app',
  ];
  const origins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(',')).split(',');
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
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

module.exports = async function handler(req, res) {
  if (!cachedApp) {
    try {
      cachedApp = await bootstrapApp();
    } catch (err) {
      console.error('[heyama-api] bootstrap failed:', err);
      throw err;
    }
  }
  return cachedApp(req, res);
};
