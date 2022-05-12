import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { GqlService } from 'src/services/gql/gql.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CronController],
  providers: [JwtService, CronService, GqlService],
})
export class CronModule {}
