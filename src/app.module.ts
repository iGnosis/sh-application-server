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
import { MediapipePoseGateway } from './gateway/socket.gateway';
import { S3Service } from './services/clients/s3/s3.service';
import { AggregateAnalyticsService } from './services/aggregate-analytics/aggregate-analytics.service';
import { ProviderChartsController } from './controllers/provider/provider-charts.controller';
import { StatsService } from './services/patient-stats/stats.service';
import { GameBenchmarkingService } from './services/game-benchmarking/game-benchmarking.service';
import { GameBenchmarkingController } from './controllers/game-benchmarking/game-benchmarking.controller';
import { ExtractInformationService } from './services/extract-information/extract-information.service';
import { VideoTranscoderService } from './services/clients/video-transcoder/video-transcoder.service';
import { PatientFeedbackController } from './controllers/cron/cron.controller';
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
import { InviteOrganizationController } from './controllers/organization/invite/invite-organization.controller';
import { CreateOrganizationController } from './controllers/organization/create/create-organization.controller';
import { CreateOrganizationService } from './services/organization/create/create-organization.service';
import { InviteOrganizationService } from './services/organization/invite/invite-organization.service';
import { UploadOrganizationController } from './controllers/organization/upload/upload-organization.controller';
import { UploadOrganizationService } from './services/organization/upload/upload-organization.service';
import { RbacController } from './controllers/rbac/rbac.controller';
import { RbacService } from './services/rbac/rbac.service';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { HasuraGuard } from './common/guards/hasura.guard';
import { StripeService } from './services/stripe/stripe.service';
import { PatientPaymentController } from './controllers/payment/patient-payment/patient-payment.controller';
import { OrganizationPaymentController } from './controllers/payment/organization-payment/organization-payment.controller';
import { SubscriptionPlanService } from './services/subscription-plan/subscription-plan.service';
import { MockController } from './mock/mock.controller';
import { SubscriptionService } from './services/subscription/subscription.service';
import { ErpnextController } from './controllers/erpnext/erpnext.controller';
import { ErpnextService } from './services/erpnext/erpnext.service';
import { LogReportService } from './services/log-report/log-report.service';
import { TesterVideosController } from './controllers/tester-videos/tester-videos.controller';
import { StsService } from './services/clients/sts/sts.service';
import { BuildVersionController } from './controllers/build-version/build-version.controller';
import { ProviderChartsService } from './services/provider/charts/provider-charts.service';
import { DashboardService } from './services/provider/dashboard/dashboard.service';
import { DashboardController } from './controllers/provider/dashboard.controller';
import { TesterVideosService } from './services/tester-videos/tester-videos.service';
import { PhiController } from './controllers/phi/phi.controller';
import { PhiService } from './services/phi/phi.service';
import { NovuService } from './services/novu/novu.service';

const winstonDailyRotateTransport = new winstonDailyRotateFile({
  dirname: '../nestjs-app-logs',
  filename: '%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  utc: true,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ssZ' }),
    winston.format.json(),
  ),
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
    ScheduleModule.forRoot(),
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
    PhiController,
    StatsController,
    PatientController,
    GameController,
    TherapistController,
    HelpAccessedController,
    SmsAuthController,
    InviteOrganizationController,
    CreateOrganizationController,
    UploadOrganizationController,
    RbacController,
    PatientPaymentController,
    OrganizationPaymentController,
    MockController,
    ErpnextController,
    TesterVideosController,
    BuildVersionController,
    DashboardController,
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
    InviteOrganizationService,
    CreateOrganizationService,
    UploadOrganizationService,
    RbacService,
    StripeService,
    {
      provide: APP_GUARD,
      useClass: HasuraGuard,
    },
    SubscriptionPlanService,
    SubscriptionService,
    ErpnextService,
    LogReportService,
    StsService,
    DashboardService,
    TesterVideosService,
    PhiService,
    NovuService,
  ],
})
export class AppModule {}
