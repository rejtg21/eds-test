import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../../shared/entities/order.entity';
import { OutboxEventEntity } from '../../shared/entities/outbox-event.entity';
import { ORDER_CREATED } from '../../shared/events/order-events';

export interface CreateOrderInput {
  customer: string;
  amount: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Transactional outbox write: the order row and its `order.created` event row
   * are committed together, or not at all. This method never touches Redis —
   * publishing is the outbox relay's job.
   */
  async createOrder(input: CreateOrderInput): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(OrderEntity, {
        customer: input.customer,
        amount: input.amount,
        status: 'PENDING',
      });
      await manager.save(order);

      const event = manager.create(OutboxEventEntity, {
        aggregateType: 'order',
        aggregateId: order.id,
        type: ORDER_CREATED,
        status: 'PENDING',
        payload: {
          orderId: order.id,
          customer: order.customer,
          amount: order.amount,
          occurredAt: new Date().toISOString(),
        },
      });
      await manager.save(event);

      this.logger.log(
        `TX committed: order ${order.id} + outbox event ${event.id} (${ORDER_CREATED})`,
      );
      return order;
    });
  }

  listOrders(): Promise<OrderEntity[]> {
    return this.dataSource.getRepository(OrderEntity).find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
