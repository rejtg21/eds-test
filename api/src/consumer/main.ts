import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { startLivenessServer } from '../shared/http/liveness-server';
import { ConsumerModule } from './consumer.module';
import { OrderConsumerService } from './order-consumer.service';

async function bootstrap() {
  const ctx = await NestFactory.createApplicationContext(ConsumerModule);
  ctx.enableShutdownHooks();

  ctx.get(OrderConsumerService).start();

  // Render/Railway run this as a web service with a `/health` check; the real
  // work happens off the Redis queue. No-op locally where PORT is unset.
  startLivenessServer('consumer');

  new Logger('consumer').log('consumer worker started');
}

void bootstrap();
