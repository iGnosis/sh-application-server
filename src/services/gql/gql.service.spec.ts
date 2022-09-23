import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from './gql.service';

describe('GqlService', () => {
  let service: GqlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GqlService, ConfigService],
    }).compile();

    service = module.get<GqlService>(GqlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
