import 'reflect-metadata';
import 'dotenv/config';

import * as http from 'http';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConsumerModule } from './consumer.module';
import { OrderConsumerService } from './order-consumer.service';

async function bootstrap() {
  const ctx = await NestFactory.createApplicationContext(ConsumerModule);
  ctx.enableShutdownHooks();

  ctx.get(OrderConsumerService).start();

  const logger = new Logger('consumer');

  // Render has no free background workers, so on Render this runs as a Web
  // Service and the deploy fails its port scan unless something binds a port.
  // The real work happens off the Redis queue; this is only a liveness socket.
  // `RENDER` is set only in Render's environment — Railway and local stay headless.
  if (process.env.RENDER) {
    const port = Number(process.env.PORT ?? 10000);
    http
      .createServer((_req, res) => res.end('ok'))
      .listen(port, () => logger.log(`render port listener on :${port}`));
  }

  logger.log('consumer worker started');
}

void bootstrap();
