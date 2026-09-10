import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { startLivenessServer } from '../shared/http/liveness-server';
import { OutboxRelayService } from './outbox-relay.service';
import { RelayModule } from './relay.module';

async function bootstrap() {
  const ctx = await NestFactory.createApplicationContext(RelayModule);
  ctx.enableShutdownHooks();

  const intervalMs = Number(process.env.RELAY_INTERVAL_MS ?? 2000);
  ctx.get(OutboxRelayService).start(intervalMs);

  // Render/Railway run this as a web service with a `/health` check; the real
  // work is the DB poll loop above. No-op locally where PORT is unset.
  startLivenessServer('relay');

  new Logger('relay').log('outbox-relay worker started');
}

void bootstrap();
