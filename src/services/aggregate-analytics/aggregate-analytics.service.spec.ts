import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../clients/gql/gql.service';
import { AggregateAnalyticsService } from './aggregate-analytics.service';
import { AnalyticsDTO } from 'src/types/global';

describe('AggregateAnalyticsService', () => {
  let service: AggregateAnalyticsService;
  const testData: AnalyticsDTO[] = [
    {
      prompt: {
        id: '1fc601e4-d2fd-4819-ab20-c972c55cb5b0',
        type: 'x',
        timestamp: 123,
        data: {
          number: 1,
        },
      },
      result: {
        type: 'success',
        timestamp: 1,
        score: 1,
      },
      reaction: {
        type: 'x',
        timestamp: 1,
        startTime: new Date().getTime(),
        completionTimeInMs: 1020,
      },
    },
    {
      prompt: {
        id: '99a2d8f7-f613-44df-b273-537b111c43f9',
        type: 'x',
        timestamp: 123,
        data: {
          number: 1,
        },
      },
      result: {
        type: 'failure',
        timestamp: 1,
        score: 0,
      },
      reaction: {
        type: 'x',
        timestamp: 1,
        startTime: new Date().getTime(),
        completionTimeInMs: 2001,
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AggregateAnalyticsService, GqlService, ConfigService],
    }).compile();

    service = module.get<AggregateAnalyticsService>(AggregateAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate avg achievement ratio', () => {
    expect(service.averageAchievementRatio(testData)).toEqual({
      key: 'avgAchievementRatio',
      value: 0.5,
      noOfSamples: 2,
    });
  });

  xit('should calculate avg completion time in milliseconds', () => {
    expect(service.averageCompletionTimeInMs(testData)).toEqual({
      key: 'avgCompletionTimeInMs',
      value: 1510.5,
      noOfSamples: 2,
    });
  });
});
