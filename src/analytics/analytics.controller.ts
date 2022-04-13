import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import { JwtService } from "src/services/jwt/jwt.service";
import { AnalyticsService } from "./analytics.service";


@Controller('analytics')
export class AnalyticsController {
  constructor(
    private jwtService: JwtService,
    private analyticsService: AnalyticsService,
  ) { }

  @HttpCode(200)
  @Post('session/data')
  async getAnalyticsData(@Body('sessionIds') sessionIds: Array<string>) {

    let results = []

    // make SQL calls for each sessionId
    await Promise.all(sessionIds.map(async (sessionId: string) => {
      const sessionDetails = await this.analyticsService.getAnalyticsData(sessionId)
      results = [...results, ...sessionDetails]
    }))

    return this.analyticsService.transformifyData(results)
  }

  @HttpCode(200)
  @Post('session/achievement-ratio')
  async sessionAchievementRatio(@Body('sessionIds') sessionIds: Array<string>) {
    return this.analyticsService.achievementPerSession(sessionIds);
  }
}
