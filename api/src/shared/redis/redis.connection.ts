import IORedis from 'ioredis';

let connection: IORedis | undefined;

/**
 * One shared ioredis connection per process. The relay process only creates a
 * BullMQ Queue; each consumer process only creates a BullMQ Worker — so sharing
 * a single connection per process is safe here.
 *
 * `maxRetriesPerRequest: null` is required by BullMQ.
 * `rediss://` URLs (TLS) are handled automatically by ioredis.
 */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}
