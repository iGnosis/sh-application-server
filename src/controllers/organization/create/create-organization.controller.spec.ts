import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from 'src/services/clients/email/email.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { CreateOrganizationService } from 'src/services/organization/create-organization/create-organization.service';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { CreateOrganizationController } from './create-organization.controller';

describe('CreateOrganizationController', () => {
  let controller: CreateOrganizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreateOrganizationController],
      providers: [
        SmsAuthService,
        GqlService,
        ConfigService,
        SmsService,
        EmailService,
        Logger,
        CreateOrganizationService,
      ],
    }).compile();

    controller = module.get<CreateOrganizationController>(CreateOrganizationController);
  });

  xit('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
