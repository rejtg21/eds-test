import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { OrdersModule } from './orders/orders.module';

/**
 * The HTTP API process. Publishes events only via the transactional outbox.
 */
@Module({
  imports: [DatabaseModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}
