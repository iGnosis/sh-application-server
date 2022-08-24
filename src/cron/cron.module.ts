import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { EventsService } from 'src/events/events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CronController],
  providers: [CronService, GqlService, EventsService],
})
export class CronModule {}
