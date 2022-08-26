import { Module } from '@nestjs/common';
import { SmsAuthService } from 'src/auth/sms-auth/sms-auth.service';
import { DatabaseModule } from 'src/database/database.module';
import { GqlService } from 'src/services/gql/gql.service';
import { SmsService } from 'src/services/sms/sms.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [GqlService, AnalyticsService, SmsAuthService, SmsService],
})
export class AnalyticsModule {}
