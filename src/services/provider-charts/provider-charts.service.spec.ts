import { Test, TestingModule } from '@nestjs/testing';
import { ProviderChartsService } from './provider-charts.service';

describe('ProviderChartsService', () => {
  let service: ProviderChartsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderChartsService],
    }).compile();

    service = module.get<ProviderChartsService>(ProviderChartsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
