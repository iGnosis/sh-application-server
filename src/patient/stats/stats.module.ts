import { Module } from '@nestjs/common';
import { JwtService } from 'src/services/jwt/jwt.service';
import { StatsController } from './stats.controller';
@Module({
  imports: [],
  controllers: [StatsController],
  providers: [JwtService],
})
export class StatsModule {}
