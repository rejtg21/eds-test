import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job, Worker } from 'bullmq';
import * as os from 'os';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';
import { ProcessedEventEntity } from '../entities/processed-event.entity';
import { ORDER_EVENTS_QUEUE } from '../events/order-events';
import { getRedisConnection } from '../redis/redis.connection';

/**
 * Event consumer. Deployed as two identical instances (consumer-1, consumer-2).
 * BullMQ + Redis hand each job to exactly one instance, so you can watch the
 * load split across both in the logs and in the orders table (`processedBy`).
 *
 * `concurrency: 1` keeps the split easy to observe.
 */
@Injectable()
export class OrderConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(OrderConsumerService.name);
  private readonly consumerId =
    process.env.RENDER_SERVICE_NAME ?? `consumer-${os.hostname()}`;
  private readonly connection = getRedisConnection();
  private worker?: Worker;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  start(): void {
    this.worker = new Worker(
      ORDER_EVENTS_QUEUE,
      (job) => this.handle(job),
      { connection: this.connection, concurrency: 1 },
    );

    this.worker.on('completed', (job) =>
      this.logger.log(`[${this.consumerId}] done job ${job.id} (${job.name})`),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(
        `[${this.consumerId}] failed job ${job?.id}: ${err.message}`,
      ),
    );

    this.logger.log(
      `[${this.consumerId}] consuming Redis queue "${ORDER_EVENTS_QUEUE}"`,
    );
  }

  private async handle(job: Job): Promise<void> {
    const eventId = job.data.eventId as string;
    const orderId = job.data.orderId as string;
    this.logger.log(
      `[${this.consumerId}] received ${job.name} for order ${orderId}`,
    );

    // Simulate the "respective task" (send email, call a service, ...).
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Business update + idempotency marker committed atomically.
    await this.dataSource.transaction(async (manager) => {
      const seen = await manager.findOne(ProcessedEventEntity, {
        where: { eventId },
      });
      if (seen) {
        this.logger.warn(
          `[${this.consumerId}] event ${eventId} already processed by ${seen.consumer} — skipping`,
        );
        return;
      }

      await manager.insert(ProcessedEventEntity, {
        eventId,
        consumer: this.consumerId,
      });
      await manager.update(
        OrderEntity,
        { id: orderId },
        {
          status: 'PROCESSED',
          processedBy: this.consumerId,
          processedAt: new Date(),
        },
      );
    });

    this.logger.log(`[${this.consumerId}] processed order ${orderId}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
