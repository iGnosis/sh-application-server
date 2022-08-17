import { Module } from '@nestjs/common';
import { Auth0Service } from 'src/auth/auth0/auth0.service';
import { DatabaseModule } from 'src/database/database.module';
import { GqlService } from 'src/services/gql/gql.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
@Module({
  imports: [DatabaseModule],
  controllers: [StatsController],
  providers: [JwtService, StatsService, Auth0Service, GqlService],
})
export class StatsModule {}
