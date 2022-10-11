import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

import { GqlService } from './services/gql/gql.service';
import { EmailService } from './services/email/email.service';
import { SpeechSynthesisModule } from './speech-synthesis/speech-synthesis.module';
import { CronModule } from './cron/cron.module';
import { StatsModule } from './patient/stats/stats.module';
import { EventsModule } from './events/events.module';
import { RewardsModule } from './patient/rewards/rewards.module';
import { SmsAuthService } from './auth/sms-auth/sms-auth.service';
import { SmsService } from './services/sms/sms.service';
import { PoseDataGateway } from './pose-data/pose-data.gateway';
import { S3Service } from './services/s3/s3.service';
import { AggregateAnalyticsService } from './services/aggregate-analytics/aggregate-analytics.service';
import { ProviderChartsService } from './services/provider-charts/provider-charts.service';
import { ProviderChartsController } from './provider-charts/provider-charts.controller';
import { StatsService } from './patient/stats/stats.service';
import { GameBenchmarkingService } from './services/game-benchmarking/game-benchmarking.service';
import { GameBenchmarkingController } from './game-benchmarking/game-benchmarking.controller';
import { ExtractInformationService } from './services/extract-information/extract-information.service';
import { VideoTranscoderService } from './services/video-transcoder/video-transcoder.service';

@Module({
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
  controllers: [AppController, ProviderChartsController, GameBenchmarkingController],
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
    GameBenchmarkingService,
    ExtractInformationService,
    VideoTranscoderService,
  ],
})
export class AppModule {}
