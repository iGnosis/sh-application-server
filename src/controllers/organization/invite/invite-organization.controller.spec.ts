import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from 'src/services/clients/email/email.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { InviteOrganizationService } from 'src/services/organization/invite/invite-organization.service';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { InviteOrganizationController } from './invite-organization.controller';

describe('InviteOrganizationController', () => {
  let controller: InviteOrganizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteOrganizationController],
      providers: [
        SmsAuthService,
        GqlService,
        ConfigService,
        SmsService,
        EmailService,
        Logger,
        InviteOrganizationService,
      ],
    }).compile();

    controller = module.get<InviteOrganizationController>(InviteOrganizationController);
  });

  xit('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
