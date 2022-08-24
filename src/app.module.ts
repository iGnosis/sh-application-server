import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { AnalyticsModule } from './analytics/analytics.module';

import { GqlService } from './services/gql/gql.service';
import { EmailService } from './services/email/email.service';
import { SpeechSynthesisModule } from './speechSynthesis/speechSynthesis.module';
import { CronModule } from './cron/cron.module';
import { StatsModule } from './patient/stats/stats.module';
import { EventsModule } from './events/events.module';
import { RewardsModule } from './patient/rewards/rewards.module';
import { SmsAuthService } from './auth/sms-auth/sms-auth.service';
import { SmsService } from './services/sms/sms.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AnalyticsModule,
    SpeechSynthesisModule,
    StatsModule,
    CronModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventsModule,
    RewardsModule,
  ],
  controllers: [AppController],
  providers: [AppService, GqlService, EmailService, SmsAuthService, SmsService],
})
export class AppModule {}
