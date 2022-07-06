import { Module } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito/cognito.service';
import { DatabaseModule } from 'src/database/database.module';
import { JwtService } from 'src/services/jwt/jwt.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [JwtService, AnalyticsService, CognitoService],
})
export class AnalyticsModule {}
