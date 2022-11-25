import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { CreateOrganizationService } from './create-organization.service';

describe('CreateOrganizationService', () => {
  let service: CreateOrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateOrganizationService, GqlService, Logger, ConfigService],
    }).compile();

    service = module.get<CreateOrganizationService>(CreateOrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
