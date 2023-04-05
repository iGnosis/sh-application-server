import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NovuService } from './novu.service';
import { Logger } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';

describe('NovuService', () => {
  let service: NovuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NovuService, ConfigService, Logger, GqlService],
    }).compile();

    service = module.get<NovuService>(NovuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
