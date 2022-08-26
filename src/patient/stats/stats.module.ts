import { Module } from '@nestjs/common';
import { SmsAuthService } from 'src/auth/sms-auth/sms-auth.service';
import { DatabaseModule } from 'src/database/database.module';
import { GqlService } from 'src/services/gql/gql.service';
import { SmsService } from 'src/services/sms/sms.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
@Module({
  imports: [DatabaseModule],
  controllers: [StatsController],
  providers: [StatsService, GqlService, SmsAuthService, SmsService],
})
export class StatsModule {}
