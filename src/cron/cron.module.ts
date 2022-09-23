import { Module } from '@nestjs/common';
import { EventsService } from 'src/events/events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';

@Module({
  controllers: [CronController],
  providers: [CronService, GqlService, EventsService],
})
export class CronModule {}
