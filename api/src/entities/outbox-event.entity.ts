import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type OutboxStatus = 'PENDING' | 'PUBLISHED';

/**
 * Transactional outbox. A row is inserted in the SAME database transaction as
 * the business change, so an event can never be "lost" if the process dies
 * right after commit. The outbox relay drains PENDING rows to Redis.
 */
@Entity({ name: 'outbox_events' })
@Index(['status', 'createdAt'])
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  aggregateType: string;

  @Column({ type: 'varchar' })
  aggregateId: string;

  /** e.g. "order.created" */
  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}
