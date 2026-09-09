import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrderConsumerService } from './order-consumer.service';

/**
 * Root module for a `consumer` worker process. Bootstrapped as a standalone
 * application context (no HTTP server) in worker-consumer.ts.
 */
@Module({
  imports: [DatabaseModule],
  providers: [OrderConsumerService],
})
export class ConsumerModule {}
