import { Module } from '@nestjs/common';
import { SmsAuthService } from 'src/auth/sms-auth/sms-auth.service';
import { EventsService } from 'src/events/events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { SmsService } from 'src/services/sms/sms.service';
import { StatsService } from '../stats/stats.service';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  controllers: [RewardsController],
  providers: [StatsService, GqlService, RewardsService, EventsService, SmsAuthService, SmsService],
})
export class RewardsModule {}
