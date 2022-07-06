import { Controller, Body, Post, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AnalyticsService } from './analytics.service';
@Controller('analytics')
@Roles(Role.THERAPIST)
@UseGuards(AuthGuard)
@ApiBearerAuth('access-token')
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
