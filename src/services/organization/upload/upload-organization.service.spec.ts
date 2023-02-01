import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { UploadOrganizationService } from './upload-organization.service';

describe('UploadOrganizationService', () => {
  let service: UploadOrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadOrganizationService, GqlService, ConfigService],
    }).compile();

    service = module.get<UploadOrganizationService>(UploadOrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
