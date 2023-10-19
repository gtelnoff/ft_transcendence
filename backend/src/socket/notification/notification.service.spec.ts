import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSocketService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationSocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationSocketService],
    }).compile();

    service = module.get<NotificationSocketService>(NotificationSocketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
