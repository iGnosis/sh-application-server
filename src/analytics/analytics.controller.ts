import { Controller, Get, Body } from "@nestjs/common";
import { JwtService } from "src/services/jwt/jwt.service";
import { AnalyticsService } from "./analytics.service";


@Controller('analytics')
export class AnalyticsController {
  constructor(
    private jwtService: JwtService,
    private analyticsService: AnalyticsService,
  ) {}

  @Get('activity/reaction-time-chart')
  async reactionTimeChart(@Body('pid') patientId: string) {
    return this.analyticsService.getPatientReactionData(patientId);
  }
}
