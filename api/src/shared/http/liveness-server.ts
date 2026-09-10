import * as http from 'http';
import { Logger } from '@nestjs/common';

/**
 * The relay and consumer processes do their real work off a DB poll loop / the
 * Redis queue — they have no HTTP surface of their own. But both Render and
 * Railway run them as web services with a `/health` check, and the deploy fails
 * its port scan / healthcheck unless something binds `PORT` and answers.
 *
 * This starts a tiny liveness socket that serves `GET /health` (and `/`) and
 * 404s everything else. It only binds when `PORT` is set (Render and Railway
 * both inject it) or when running on Render — local `dev:relay` / `dev:consumer`
 * set neither and stay headless.
 */
export function startLivenessServer(service: string): http.Server | undefined {
  if (!process.env.PORT && !process.env.RENDER) {
    return undefined;
  }

  const port = Number(process.env.PORT ?? 10000);
  const logger = new Logger(service);

  const server = http.createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method === 'GET' && (path === '/health' || path === '/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ status: 'ok', service, ts: new Date().toISOString() }),
      );
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'not_found' }));
  });

  server.listen(port, '0.0.0.0', () =>
    logger.log(`liveness server on :${port} (GET /health)`),
  );

  return server;
}
