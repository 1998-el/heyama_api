require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const { AppModule } = require('../dist/src/app.module');

let cachedApp;

async function bootstrapApp() {
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

module.exports = async function handler(req, res) {
  if (!cachedApp) {
    cachedApp = await bootstrapApp();
  }
  return cachedApp(req, res);
};
