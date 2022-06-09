import { Controller, Body, Post, HttpCode } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
@Controller('analytics')
// TODO: Enable Guards later.
// @UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @HttpCode(200)
  @Post('session/data')
  async getAnalyticsData(@Body('sessionIds') sessionIds: Array<string>) {
    let results = [];
    await Promise.all(
      sessionIds.map(async (sessionId: string) => {
        const sessionDetails = await this.analyticsService.getAnalyticsData(sessionId);
        results = [...results, ...sessionDetails];
      }),
    );
    return this.analyticsService.transformifyData(results);
  }

  @HttpCode(200)
  @Post('session/engagement-ratio')
  async sessionEngagementRatio(@Body('sessionId') sessionId: string) {
    return this.analyticsService.sessionEngagementRatio(sessionId);
  }

  @HttpCode(200)
  @Post('patient/achievement-ratio')
  async patientAchievementRatio(
    @Body('patientId') patientId: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.analyticsService.patientAchievementPerSession(patientId, startDate, endDate);
  }

  @HttpCode(200)
  @Post('patient/engagement-ratio')
  async patientEngagementRatio(
    @Body('patientId') patientId: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.analyticsService.patientEngagementRatio(patientId, startDate, endDate);
  }
}
