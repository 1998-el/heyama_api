import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================
  // CORS - Allowed origins
  // ============================================
  const allowedOrigins = [
    'https://heyama-portal.vercel.app',        // Deployed frontend
    'http://localhost:3000',                    // Local frontend
    'http://localhost:3001',                    // Other local frontend
    'http://localhost:8081',                    // Expo React Native
    'http://192.168.1.*',                       // Local network
    'https://heyama-api.vercel.app',            // If you change domain
  ];

  // Alternative: use environment variables
  // const envOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  // const allowedOrigins = [...envOrigins, ...allowedOrigins];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without origin (e.g., Postman, curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowed => {
        // Support wildcards (*)
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Credentials',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ============================================
  // Validation
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // ============================================
  // Route prefix
  // ============================================
  app.setGlobalPrefix('api');

  // ============================================
  // Server startup
  // ============================================
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  
  console.log(`API started on http://localhost:${port}/api`);
  console.log(`CORS allowed for: ${allowedOrigins.join(', ')}`);
}
bootstrap();