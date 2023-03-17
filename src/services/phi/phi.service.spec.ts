import { Test, TestingModule } from '@nestjs/testing';
import { PhiService } from './phi.service';

describe('PhiService', () => {
  let service: PhiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhiService],
    }).compile();

    service = module.get<PhiService>(PhiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
