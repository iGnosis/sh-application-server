import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../clients/gql/gql.service';
import { TesterVideosService } from './tester-videos.service';

describe('TesterVideosService', () => {
  let service: TesterVideosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TesterVideosService, GqlService, ConfigService],
    }).compile();

    service = module.get<TesterVideosService>(TesterVideosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
