import { Controller, Body, Post } from "@nestjs/common";
import { JwtService } from "src/services/jwt/jwt.service";
import { AnalyticsService } from "./analytics.service";


@Controller('analytics')
export class AnalyticsController {
  constructor(
    private jwtService: JwtService,
    private analyticsService: AnalyticsService,
  ) { }

  @Post('activity/reaction-time-chart')
  async reactionTimeChart(@Body('sessionId') sessionId: string) {
    return this.analyticsService.getAnalyticsData(sessionId);
  }

  @Post('activity/data')
  async getAnalyticsData(@Body('sessionIds') sessionIds: Array<string>) {

    let results = []

    // make SQL calls for each sessionId
    await Promise.all(sessionIds.map(async (sessionId: string) => {
      const sessionDetails = await this.analyticsService.getAnalyticsData(sessionId)
      results = [...results, ...sessionDetails]
    }))

    return this.analyticsService.transformifyData(results)
  }

  @Post('activity/achievement-ratio-chart')
  async achievementRatioChart(@Body('pid') patientId: string) {
    return this.analyticsService.getPatientAchievementDataPerActivity(patientId);
  }
}
