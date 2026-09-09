import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConsumerModule } from './consumer/consumer.module';
import { OrderConsumerService } from './consumer/order-consumer.service';

async function bootstrap() {
  const ctx = await NestFactory.createApplicationContext(ConsumerModule);
  ctx.enableShutdownHooks();

  ctx.get(OrderConsumerService).start();

  new Logger('consumer').log('consumer worker started');
}

void bootstrap();
