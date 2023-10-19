import { Test, TestingModule } from '@nestjs/testing';
import { BlockedPlayerService } from './blocked-player.service';

describe('BlockedPlayerService', () => {
  let service: BlockedPlayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockedPlayerService],
    }).compile();

    service = module.get<BlockedPlayerService>(BlockedPlayerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
