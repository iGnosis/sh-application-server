import { Test, TestingModule } from '@nestjs/testing';
import { AggregateAnalyticsService } from './aggregate-analytics.service';

describe('AggregateAnalyticsService', () => {
  let service: AggregateAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AggregateAnalyticsService],
    }).compile();

    service = module.get<AggregateAnalyticsService>(AggregateAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
