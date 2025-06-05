import { Test, TestingModule } from '@nestjs/testing';
import { OrderExpiryProcessor } from './order-expiry.processor';
import { OrdersService } from '../services/orders.service';
import { Job } from 'bullmq';

describe('OrderExpiryProcessor', () => {
  let processor: OrderExpiryProcessor;
  let ordersService: jest.Mocked<OrdersService>;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderExpiryProcessor,
        {
          provide: OrdersService,
          useValue: {
            expireOrder: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    processor = module.get<OrderExpiryProcessor>(OrderExpiryProcessor);
    ordersService = module.get(OrdersService) as jest.Mocked<OrdersService>;
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should call expireOrder with the correct order id', async () => {
      const job = {
        data: { orderId: 123 },
      } as Job<{ orderId: number }>;
      
      await processor.process(job);
      
      expect(ordersService.expireOrder).toHaveBeenCalledWith(123);
    });

    it('should handle errors during processing', async () => {
      const job = {
        data: { orderId: 123 },
      } as Job<{ orderId: number }>;
      
      const error = new Error('Expiry failed');
      ordersService.expireOrder.mockRejectedValueOnce(error);
      
      await expect(processor.process(job)).rejects.toThrow('Expiry failed');
    });
  });
});