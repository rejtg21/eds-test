import 'reflect-metadata';
import 'dotenv/config';

import * as http from 'http';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OutboxRelayService } from './outbox-relay.service';
import { RelayModule } from './relay.module';

async function bootstrap() {
  const ctx = await NestFactory.createApplicationContext(RelayModule);
  ctx.enableShutdownHooks();

  const intervalMs = Number(process.env.RELAY_INTERVAL_MS ?? 2000);
  ctx.get(OutboxRelayService).start(intervalMs);

  const logger = new Logger('relay');

  // Render has no free background workers, so on Render this runs as a Web
  // Service and the deploy fails its port scan unless something binds a port.
  // The real work is the DB poll loop above; this is only a liveness socket.
  // `RENDER` is set only in Render's environment — Railway and local stay headless.
  if (process.env.RENDER) {
    const port = Number(process.env.PORT ?? 10000);
    http
      .createServer((_req, res) => res.end('ok'))
      .listen(port, () => logger.log(`render port listener on :${port}`));
  }

  logger.log('outbox-relay worker started');
}

void bootstrap();
