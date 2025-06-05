import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrdersService } from '../services/orders.service';

@Processor('order-expiry')
export class OrderExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderExpiryProcessor.name);

  constructor(private readonly ordersService: OrdersService) {
    super();
  }

  async process(job: Job<{ orderId: number }>): Promise<void> {
    const { orderId } = job.data;

    try {
      this.logger.log(`Processing order expiry for order ID: ${orderId}`);
      await this.ordersService.expireOrder(orderId);
      this.logger.log(
        `Successfully processed order expiry for order ID: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process order expiry for order ID: ${orderId}`,
        error,
      );
      throw error;
    }
  }
}
