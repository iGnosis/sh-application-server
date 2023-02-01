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

  xit('should verify that patient is unique', async () => {
    // given
    const orgId = '00000000-0000-0000-0000-000000000000';
    const email = 'example@gmail.com';
    const phoneCountryCode = '+1';
    const phoneNumber = '12312312312';

    // when
    const resp = await service.isPatientUnique(orgId, phoneNumber, phoneCountryCode, email);

    // then
    expect(resp).toEqual(true);
  });
});
