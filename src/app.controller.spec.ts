import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SmsAuthService } from './auth/sms-auth/sms-auth.service';
import { CronModule } from './cron/cron.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { RewardsModule } from './patient/rewards/rewards.module';
import { StatsModule } from './patient/stats/stats.module';
import { StatsService } from './patient/stats/stats.service';
import { PoseDataGateway } from './pose-data/pose-data.gateway';
import { ProviderChartsController } from './provider-charts/provider-charts.controller';
import { AggregateAnalyticsService } from './services/aggregate-analytics/aggregate-analytics.service';
import { EmailService } from './services/email/email.service';
import { GqlService } from './services/gql/gql.service';
import { ProviderChartsService } from './services/provider-charts/provider-charts.service';
import { S3Service } from './services/s3/s3.service';
import { SmsService } from './services/sms/sms.service';
import { SpeechSynthesisModule } from './speech-synthesis/speech-synthesis.module';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        AuthModule,
        DatabaseModule,
        SpeechSynthesisModule,
        StatsModule,
        CronModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        EventsModule,
        RewardsModule,
      ],
      controllers: [AppController, ProviderChartsController],
      providers: [
        AppService,
        GqlService,
        EmailService,
        SmsAuthService,
        SmsService,
        PoseDataGateway,
        S3Service,
        AggregateAnalyticsService,
        StatsService,
        ProviderChartsService,
      ],
    }).compile();
  });

  describe('ping', () => {
    it('should correctly ping', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.ping()).toBe('success');
    });
  });
});
