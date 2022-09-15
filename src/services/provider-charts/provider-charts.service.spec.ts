import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from 'src/database/database.module';
import { StatsService } from 'src/patient/stats/stats.service';
import { GqlService } from '../gql/gql.service';
import { ProviderChartsService } from './provider-charts.service';

describe('ProviderChartsService', () => {
  let service: ProviderChartsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ProviderChartsService, StatsService, GqlService, ConfigService],
    }).compile();

    service = module.get<ProviderChartsService>(ProviderChartsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
