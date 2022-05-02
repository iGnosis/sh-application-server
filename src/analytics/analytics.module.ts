import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { JwtService } from 'src/services/jwt/jwt.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [JwtService, AnalyticsService],
})
export class AnalyticsModule {}
