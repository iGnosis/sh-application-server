import { Module } from '@nestjs/common';
import { Auth0Service } from 'src/auth/auth0/auth0.service';
import { CognitoService } from 'src/auth/cognito/cognito.service';
import { DatabaseModule } from 'src/database/database.module';
import { JwtService } from 'src/services/jwt/jwt.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [JwtService, AnalyticsService, CognitoService, Auth0Service],
})
export class AnalyticsModule {}
