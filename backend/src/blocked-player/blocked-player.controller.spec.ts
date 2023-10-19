import { Test, TestingModule } from '@nestjs/testing';
import { BlockedPlayerController } from './blocked-player.controller';

describe('BlockedPlayerController', () => {
  let controller: BlockedPlayerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockedPlayerController],
    }).compile();

    controller = module.get<BlockedPlayerController>(BlockedPlayerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
