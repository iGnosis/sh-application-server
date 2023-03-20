import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../clients/gql/gql.service';
import { PhiService } from './phi.service';

describe('PhiService', () => {
  let service: PhiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhiService, GqlService, ConfigService],
    }).compile();

    service = module.get<PhiService>(PhiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
