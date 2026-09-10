/** Name of the BullMQ queue that carries order domain events through Redis. */
export const ORDER_EVENTS_QUEUE = 'order-events';

/** Event type string stored in the outbox and used as the BullMQ job name. */
export const ORDER_CREATED = 'order.created';

/** Shape of the `order.created` event payload. */
export interface OrderCreatedEvent {
  eventId: string;
  orderId: string;
  customer: string;
  amount: number;
  occurredAt: string;
}
