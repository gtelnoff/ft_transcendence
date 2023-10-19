import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type'],
    origin: '*',
  });
  await app.listen(process.env.BACKEND_PORT, '0.0.0.0');
}
bootstrap();
