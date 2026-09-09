import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { OrderEntity } from '../entities/order.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { ProcessedEventEntity } from '../entities/processed-event.entity';

/**
 * Shared Postgres config for all three processes (API, relay, consumer).
 *
 * Only the process started with DB_SYNC=true runs schema sync — otherwise all
 * services race to CREATE TABLE on first boot and deadlock. On Render, DB_SYNC
 * is set on the `api` service only; the workers connect and retry until the
 * tables exist.
 *
 * `synchronize` auto-creates the schema — fine for a demo, never in production.
 * Use migrations for real work.
 */
export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/render_test',
    entities: [OrderEntity, OutboxEventEntity, ProcessedEventEntity],
    synchronize: process.env.DB_SYNC === 'true',
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    retryAttempts: 15,
    retryDelay: 3000,
  };
}
