import { Test, TestingModule } from '@nestjs/testing';
import { PollyService } from './polly.service';

describe('PollyService', () => {
  let service: PollyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PollyService],
    }).compile();

    service = module.get<PollyService>(PollyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
