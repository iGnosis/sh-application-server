import { Test, TestingModule } from '@nestjs/testing';
import { TesterVideosController } from './tester-videos.controller';

describe('TesterVideosController', () => {
  let controller: TesterVideosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TesterVideosController],
    }).compile();

    controller = module.get<TesterVideosController>(TesterVideosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
