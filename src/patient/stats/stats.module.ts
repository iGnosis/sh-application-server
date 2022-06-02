import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { JwtService } from 'src/services/jwt/jwt.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
@Module({
  imports: [DatabaseModule],
  controllers: [StatsController],
  providers: [JwtService, StatsService],
})
export class StatsModule {}
