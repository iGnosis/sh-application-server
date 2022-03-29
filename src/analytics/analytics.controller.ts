import { Controller, Body, Post } from "@nestjs/common";
import { JwtService } from "src/services/jwt/jwt.service";
import { AnalyticsService } from "./analytics.service";


@Controller('analytics')
export class AnalyticsController {
  constructor(
    private jwtService: JwtService,
    private analyticsService: AnalyticsService,
  ) {}

  @Post('activity/reaction-time-chart')
  async reactionTimeChart(@Body('sessionId') sessionId: string) {
    return this.analyticsService.getPatientReactionDataPerActivity(sessionId);
  }

  @Post('activity/achievement-ratio-chart')
  async achievementRatioChart(@Body('pid') patientId: string) {
    return this.analyticsService.getPatientAchievementDataPerActivity(patientId);
  }
}
