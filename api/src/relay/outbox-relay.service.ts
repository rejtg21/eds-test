import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { OutboxEventEntity } from '../shared/entities/outbox-event.entity';
import { ORDER_EVENTS_QUEUE } from '../shared/events/order-events';
import { getRedisConnection } from '../shared/redis/redis.connection';

const BATCH_SIZE = 20;

/**
 * Outbox relay / message dispatcher.
 *
 * Every `intervalMs` it opens a transaction, locks a batch of PENDING outbox
 * rows with `FOR UPDATE SKIP LOCKED` (so multiple relay instances never grab
 * the same row), publishes each to the Redis queue, and marks it PUBLISHED in
 * the same transaction.
 *
 * Failure modes:
 *  - publish throws        -> TX rolls back, rows stay PENDING, retried next tick
 *  - crash after publish,
 *    before commit          -> rows stay PENDING, re-published (jobId dedupes;
 *                              worst case the consumer sees a duplicate and its
 *                              idempotency guard drops it)
 * => at-least-once delivery.
 */
@Injectable()
export class OutboxRelayService implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly connection = getRedisConnection();
  private readonly queue = new Queue(ORDER_EVENTS_QUEUE, {
    connection: this.connection,
  });

  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  start(intervalMs = 2000): void {
    this.logger.log(
      `Outbox relay polling "${ORDER_EVENTS_QUEUE}" every ${intervalMs}ms`,
    );
    this.timer = setInterval(() => {
      this.tick().catch((err: Error) => {
        // Schema may not exist yet on a cold Render deploy (the API creates it).
        if (/does not exist/.test(err.message)) {
          this.logger.warn(`waiting for schema: ${err.message}`);
        } else {
          this.logger.error('tick failed', err);
        }
      });
    }, intervalMs);
  }

  private async tick(): Promise<void> {
    if (this.ticking) return; // don't overlap slow ticks
    this.ticking = true;
    try {
      const published = await this.dataSource.transaction(async (manager) => {
        const rows = await manager
          .getRepository(OutboxEventEntity)
          .createQueryBuilder('e')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where('e.status = :status', { status: 'PENDING' })
          .orderBy('e.createdAt', 'ASC')
          .limit(BATCH_SIZE)
          .getMany();

        for (const row of rows) {
          await this.queue.add(
            row.type,
            { eventId: row.id, ...row.payload },
            {
              jobId: row.id, // idempotent enqueue
              removeOnComplete: 1000,
              removeOnFail: 5000,
              attempts: 5,
              backoff: { type: 'exponential', delay: 1000 },
            },
          );
          row.status = 'PUBLISHED';
          row.publishedAt = new Date();
          row.attempts += 1;
          await manager.save(OutboxEventEntity, row);
        }

        return rows.length;
      });

      if (published > 0) {
        this.logger.log(`Published ${published} event(s) to Redis`);
      }
    } finally {
      this.ticking = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.queue.close();
    await this.connection.quit();
  }
}
