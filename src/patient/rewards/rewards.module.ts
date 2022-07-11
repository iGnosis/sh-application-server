import { Module } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito/cognito.service';
import { DatabaseModule } from 'src/database/database.module';
import { EventsService } from 'src/events/events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { StatsService } from '../stats/stats.service';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RewardsController],
  providers: [StatsService, CognitoService, GqlService, RewardsService, EventsService],
})
export class RewardsModule {}
