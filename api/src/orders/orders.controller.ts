import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

interface CreateOrderBody {
  customer?: string;
  amount?: number;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Called by the web button. Creates the order + outbox event in one TX. */
  @Post()
  create(@Body() body: CreateOrderBody) {
    return this.orders.createOrder({
      customer: body.customer?.trim() || `cust-${Math.floor(Math.random() * 1000)}`,
      amount:
        typeof body.amount === 'number' && body.amount > 0
          ? Math.floor(body.amount)
          : Math.floor(Math.random() * 500) + 1,
    });
  }

  /** Polled by the web page to show status / which consumer handled each order. */
  @Get()
  list() {
    return this.orders.listOrders();
  }
}
