import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from 'src/database/database.module';
import { StatsService } from 'src/services/patient-stats/stats.service';
import { GqlService } from '../../clients/gql/gql.service';
import { ProviderChartsService } from './provider-charts.service';
import { Logger } from '@nestjs/common';

describe('ProviderChartsService', () => {
  let service: ProviderChartsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ProviderChartsService, StatsService, GqlService, ConfigService, Logger],
    }).compile();

    service = module.get<ProviderChartsService>(ProviderChartsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
