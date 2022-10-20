import { Logger, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as winstonDailyRotateFile from 'winston-daily-rotate-file';

import { GqlService } from './services/clients/gql/gql.service';
import { EmailService } from './services/clients/email/email.service';
import { SmsAuthService } from './services/sms-auth/sms-auth.service';
import { SmsService } from './services/clients/sms/sms.service';
import { MediapipePoseGateway } from './gateway/mediapipe-pose/mediapipe-pose.gateway';
import { S3Service } from './services/clients/s3/s3.service';
import { AggregateAnalyticsService } from './services/aggregate-analytics/aggregate-analytics.service';
import { ProviderChartsService } from './services/provider-charts/provider-charts.service';
import { ProviderChartsController } from './controllers/provider-charts/provider-charts.controller';
import { StatsService } from './services/patient-stats/stats.service';
import { GameBenchmarkingService } from './services/game-benchmarking/game-benchmarking.service';
import { GameBenchmarkingController } from './controllers/game-benchmarking/game-benchmarking.controller';
import { ExtractInformationService } from './services/extract-information/extract-information.service';
import { VideoTranscoderService } from './services/clients/video-transcoder/video-transcoder.service';
import { PatientFeedbackController } from './controllers/patient-feedback/cron.controller';
import { CronService } from './services/cron/cron.service';
import { SpeechSynthesisController } from './controllers/speech-synthesis/speech-synthesis.controller';
import { PollyService } from './services/clients/polly/polly.service';
import { RewardsController } from './controllers/rewards/rewards.controller';
import { RewardsService } from './services/rewards/rewards.service';
import { EventsService } from 'src/services/events/events.service';
import { StatsController } from './controllers/stats/stats.controller';
import { HelpAccessedController } from './controllers/events/help-accessed/help-accessed.controller';
import { TherapistController } from './controllers/events/therapist/therapist.controller';
import { GameController } from './controllers/events/game/game.controller';
import { PatientController } from './controllers/events/patient/patient.controller';
import { SmsAuthController } from './controllers/sms-auth/sms-auth.controller';

const winstonDailyRotateTransport = new winstonDailyRotateFile({
  dirname: 'logs',
  filename: '%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  utc: true,
});

const alignColorsAndTime = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.colorize({
    all: true,
  }),
  winston.format.label({
    label: '[LOGGER]',
  }),
  winston.format.timestamp({
    format: 'YY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(
    (info) =>
      ` ${info.label}  ${info.timestamp}  ${info.level} : ${info.message} ${info.stack || ''}`,
  ),
);

const nestLikeFormatting = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('AppServer', {
    colors: true,
    prettyPrint: true,
  }),
);

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRoot({
      level: 'debug',
      format: winston.format.json(),
      transports: [
        winstonDailyRotateTransport,
        new winston.transports.Console({ format: nestLikeFormatting }),
      ],
      exceptionHandlers: [
        winstonDailyRotateTransport,
        new winston.transports.Console({ format: nestLikeFormatting }),
      ],
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
    PatientController,
    GameController,
    TherapistController,
    HelpAccessedController,
    SmsAuthController,
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
})
export class AppModule {}
