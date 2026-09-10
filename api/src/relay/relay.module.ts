import { Module } from '@nestjs/common';
import { DatabaseModule } from '../shared/database/database.module';
import { OutboxRelayService } from './outbox-relay.service';

/**
 * Root module for the `outbox-relay` worker process. Bootstrapped as a
 * standalone application context (no HTTP server) in relay/main.ts.
 */
@Module({
  imports: [DatabaseModule],
  providers: [OutboxRelayService],
})
export class RelayModule {}
