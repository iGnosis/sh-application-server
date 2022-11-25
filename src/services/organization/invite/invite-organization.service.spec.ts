import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from 'src/services/clients/email/email.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { InviteOrganizationService } from './invite-organization.service';

describe('InviteOrganizationService', () => {
  let service: InviteOrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InviteOrganizationService, GqlService, EmailService, Logger, ConfigService],
    }).compile();

    service = module.get<InviteOrganizationService>(InviteOrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
