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
import { Auth0Service } from 'src/auth/auth0/auth0.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientController, GameController, TherapistController, HelpAccessedController],
  providers: [EventsService, GqlService, CronService, StatsService, Auth0Service],
})
export class EventsModule {}
