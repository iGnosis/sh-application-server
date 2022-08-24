import { Module } from '@nestjs/common';
import { EmailService } from 'src/services/email/email.service';
import { GqlService } from 'src/services/gql/gql.service';
import { EventsService } from 'src/events/events.service';
import { Auth0Service } from './auth0/auth0.service';
import { SmsAuthService } from './sms-auth/sms-auth.service';
import { SmsAuthController } from './sms-auth/sms-auth.controller';
import { SmsService } from 'src/services/sms/sms.service';

@Module({
  controllers: [SmsAuthController],
  providers: [GqlService, EmailService, EventsService, Auth0Service, SmsAuthService, SmsService],
})
export class AuthModule {}
