import { Module } from '@nestjs/common';
import { PatientController } from './patient/patient.controller';
import { GameController } from './game/game.controller';
import { TherapistController } from './therapist/therapist.controller';
import { EventsService } from './events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { CronService } from 'src/cron/cron.service';
import { StatsService } from 'src/patient/stats/stats.service';
import { DatabaseModule } from 'src/database/database.module';
import { HelpAccessedController } from './help-accessed/help-accessed.controller';
import { SmsAuthService } from 'src/auth/sms-auth/sms-auth.service';
import { SmsService } from 'src/services/sms/sms.service';
import { S3Service } from 'src/services/s3/s3.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientController, GameController, TherapistController, HelpAccessedController],
  providers: [
    EventsService,
    GqlService,
    CronService,
    StatsService,
    SmsAuthService,
    SmsService,
    S3Service,
  ],
})
export class EventsModule {}
