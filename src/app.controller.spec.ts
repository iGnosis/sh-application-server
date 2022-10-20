import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SmsAuthService } from './services/sms-auth/sms-auth.service';
import { DatabaseModule } from './database/database.module';
import { StatsService } from './services/patient-stats/stats.service';
import { MediapipePoseGateway } from './gateway/mediapipe-pose/mediapipe-pose.gateway';
import { ProviderChartsController } from './controllers/provider-charts/provider-charts.controller';
import { AggregateAnalyticsService } from './services/aggregate-analytics/aggregate-analytics.service';
import { EmailService } from './services/clients/email/email.service';
import { GqlService } from './services/clients/gql/gql.service';
import { ProviderChartsService } from './services/provider-charts/provider-charts.service';
import { S3Service } from './services/clients/s3/s3.service';
import { SmsService } from './services/clients/sms/sms.service';
import { CronService } from './services/cron/cron.service';
import { ExtractInformationService } from './services/extract-information/extract-information.service';
import { GameBenchmarkingService } from './services/game-benchmarking/game-benchmarking.service';
import { PollyService } from './services/clients/polly/polly.service';
import { RewardsService } from './services/rewards/rewards.service';
import { VideoTranscoderService } from './services/clients/video-transcoder/video-transcoder.service';
import { GameBenchmarkingController } from './controllers/game-benchmarking/game-benchmarking.controller';
import { PatientFeedbackController } from './controllers/patient-feedback/cron.controller';
import { RewardsController } from './controllers/rewards/rewards.controller';
import { SpeechSynthesisController } from './controllers/speech-synthesis/speech-synthesis.controller';
import { StatsController } from './controllers/stats/stats.controller';
import { EventsService } from './services/events/events.service';
import { Logger } from '@nestjs/common';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      controllers: [
        AppController,
        ProviderChartsController,
        GameBenchmarkingController,
        PatientFeedbackController,
        SpeechSynthesisController,
        RewardsController,
        StatsController,
      ],
      providers: [
        AppService,
        GqlService,
        EmailService,
        SmsAuthService,
        SmsService,
        MediapipePoseGateway,
        S3Service,
        AggregateAnalyticsService,
        StatsService,
        ProviderChartsService,
        GameBenchmarkingService,
        ExtractInformationService,
        VideoTranscoderService,
        CronService,
        PollyService,
        RewardsService,
        EventsService,
        Logger,
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
