import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OrderStatus = 'PENDING' | 'PROCESSED';

/**
 * The business record. Created by the HTTP API inside a transaction, together
 * with an OutboxEventEntity row.
 */
@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  customer: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: OrderStatus;

  /** Which consumer instance handled the order.created event. */
  @Column({ type: 'varchar', nullable: true })
  processedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
