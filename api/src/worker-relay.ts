import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { OutboxModule } from './outbox/outbox.module';

async function bootstrap() {
  const ctx = await NestFactory.createApplicationContext(OutboxModule);
  ctx.enableShutdownHooks();

  const intervalMs = Number(process.env.RELAY_INTERVAL_MS ?? 2000);
  ctx.get(OutboxRelayService).start(intervalMs);

  new Logger('relay').log('outbox-relay worker started');
}

void bootstrap();
