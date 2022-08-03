import { Module } from '@nestjs/common';
import { Auth0Service } from 'src/auth/auth0/auth0.service';
import { DatabaseModule } from 'src/database/database.module';
import { EventsService } from 'src/events/events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { StatsService } from '../stats/stats.service';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RewardsController],
  providers: [StatsService, GqlService, RewardsService, EventsService, Auth0Service],
})
export class RewardsModule {}
