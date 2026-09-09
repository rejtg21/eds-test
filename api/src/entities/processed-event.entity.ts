import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Consumer-side idempotency ledger. Delivery is at-least-once, so a consumer
 * may see the same event twice. Inserting the eventId here (in the same
 * transaction as the business update) makes reprocessing a safe no-op.
 */
@Entity({ name: 'processed_events' })
export class ProcessedEventEntity {
  @PrimaryColumn('uuid')
  eventId: string;

  @Column({ type: 'varchar' })
  consumer: string;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt: Date;
}
