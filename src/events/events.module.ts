import { Module } from '@nestjs/common';
import { PatientController } from './patient/patient.controller';
import { SessionController } from './session/session.controller';
import { TherapistController } from './therapist/therapist.controller';
import { EventsService } from './events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { CronService } from 'src/cron/cron.service';
import { StatsService } from 'src/patient/stats/stats.service';
import { DatabaseModule } from 'src/database/database.module';
import { HelpAccessedController } from './help-accessed/help-accessed.controller';
import { CognitoService } from 'src/auth/cognito/cognito.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientController, SessionController, TherapistController, HelpAccessedController],
  providers: [EventsService, GqlService, CronService, StatsService, CognitoService],
})
export class EventsModule {}
