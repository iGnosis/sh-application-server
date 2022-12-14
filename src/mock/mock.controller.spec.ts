import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from 'src/services/clients/email/email.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { MockController } from './mock.controller';

describe('MockController', () => {
  let controller: MockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MockController],
      providers: [ConfigService, SmsAuthService, GqlService, SmsService, EmailService, Logger],
    }).compile();

    controller = module.get<MockController>(MockController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
