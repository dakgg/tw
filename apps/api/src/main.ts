import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

try {
  process.loadEnvFile('../../.env');
} catch {
  // 환경 파일이 없어도 기본 로컬 설정으로 실행됩니다.
}

async function bootstrap() {
  const adapter = new FastifyAdapter({ bodyLimit: 3 * 1024 * 1024 });
  adapter.getInstance().addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    return payload;
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('EH Console API')
    .setDescription('숙소·예약·재고·청소·게스트·보상 자료 관리. 로컬 워크스페이스이며 OTA 실연동은 미설정입니다.')
    .setVersion('0.2.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(Number(process.env.PORT ?? 4000), process.env.API_HOST ?? '127.0.0.1');
}

void bootstrap();
