import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { AnalyticsModule } from './analytics/analytics.module';

import { AuthService } from './services/auth/auth.service';
import { GqlService } from './services/gql/gql.service';
import { JwtService } from './services/jwt/jwt.service';
import { EmailService } from './services/email/email.service';
import { SpeechSynthesisModule } from './speechSynthesis/speechSynthesis.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AnalyticsModule,
    SpeechSynthesisModule,
    CronModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, GqlService, AuthService, JwtService, EmailService],
})
export class AppModule { }
