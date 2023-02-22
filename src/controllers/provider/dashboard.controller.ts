import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { DashboardService } from 'src/services/provider/dashboard/dashboard.service';
import { DashboardDto } from './dashbaord.dto';
import { DashboardData } from 'src/types/global';
import { DashboardMetricsEnums } from 'src/common/enums/enum';
import { StatsService } from 'src/services/patient-stats/stats.service';

@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseInterceptors(new TransformResponseInterceptor())
export class DashboardController {
  constructor(private dashboardService: DashboardService, private statsService: StatsService) {}

  @Get('conversion')
  async conversion(@Query() query: DashboardDto, @User('orgId') orgId: string) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const type = query.type;

    const diff = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - diff);
    const prevEndDate = new Date(endDate.getTime() - diff);

    let response: Partial<DashboardData> = {};

    if (type == DashboardMetricsEnums.NEW_USERS) {
      const newCount = await this.dashboardService.newUsers(startDate, endDate, orgId);
      const oldCount = await this.dashboardService.newUsers(prevStartDate, prevEndDate, orgId);
      response = this.dashboardService.buildMetricResponse(response, newCount, oldCount);
      response.metric = DashboardMetricsEnums.NEW_USERS;
    } else if (type == DashboardMetricsEnums.ACTIVATION_MILESTONE) {
      const newCount = await this.dashboardService.activationMilestone(startDate, endDate, orgId);
      const oldCount = await this.dashboardService.activationMilestone(
        prevStartDate,
        prevEndDate,
        orgId,
      );

      response = this.dashboardService.buildMetricResponse(response, newCount, oldCount);
      response.metric = DashboardMetricsEnums.ACTIVATION_MILESTONE;
    } else if (type == DashboardMetricsEnums.ACTIVATION_RATE) {
      const newUsersCount = await this.dashboardService.newUsers(startDate, endDate, orgId);
      const oldUsersCount = await this.dashboardService.newUsers(prevStartDate, prevEndDate, orgId);

      const newActivationMilestoneCount = await this.dashboardService.activationMilestone(
        startDate,
        endDate,
        orgId,
      );
      const oldActivationMilestoneCount = await this.dashboardService.activationMilestone(
        prevStartDate,
        prevEndDate,
        orgId,
      );

      const newActivationRate = (newActivationMilestoneCount / newUsersCount) * 100;
      const oldActivationRate = (oldActivationMilestoneCount / oldUsersCount) * 100;

      response = this.dashboardService.buildMetricResponse(
        response,
        newActivationRate,
        oldActivationRate,
      );
      response.metric = DashboardMetricsEnums.ACTIVATION_RATE;
    }
    return response;
  }

  @Get('engagement')
  async engagement(@Query() query: DashboardDto, @User('orgId') orgId: string) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const type = query.type;

    const diff = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - diff);
    const prevEndDate = new Date(endDate.getTime() - diff);

    let response: Partial<DashboardData> = {};

    if (type === DashboardMetricsEnums.AVG_USER_ENGAGEMENT) {
      const { patientsCount, totalGamePlayMins: newTotalGamePlayMins } =
        await this.dashboardService.avgUserEngagement(startDate, endDate, orgId);
      const { totalGamePlayMins: oldTotalGamePlayMins } =
        await this.dashboardService.avgUserEngagement(prevStartDate, prevEndDate, orgId);

      const newAvgUserEngagement = newTotalGamePlayMins / patientsCount;
      const oldAvgUserEngagement = oldTotalGamePlayMins / patientsCount;

      response = this.dashboardService.buildMetricResponse(
        response,
        newAvgUserEngagement,
        oldAvgUserEngagement,
      );
      response.metric = DashboardMetricsEnums.AVG_USER_ENGAGEMENT;
    } else if (type === DashboardMetricsEnums.AVG_ACTIVITIES_PLAYED) {
      // TODO: get activity count dynamically!
      const numOfActivities = 4;

      const newGamesPlayedCount = await this.dashboardService.gamesPlayedCount(
        startDate,
        endDate,
        orgId,
      );
      const oldGamesPlayedCount = await this.dashboardService.gamesPlayedCount(
        prevStartDate,
        prevEndDate,
        orgId,
      );

      const newAvgActivitiesPlayed = newGamesPlayedCount / numOfActivities;
      const oldAvgActivitiesPlayed = oldGamesPlayedCount / numOfActivities;

      response = this.dashboardService.buildMetricResponse(
        response,
        newAvgActivitiesPlayed,
        oldAvgActivitiesPlayed,
      );
      response.metric = DashboardMetricsEnums.AVG_ACTIVITIES_PLAYED;
    } else if (type === DashboardMetricsEnums.ADOPTION_RATE) {
      const newAdoptionRate = await this.dashboardService.adpotionRate(startDate, endDate, orgId);
      const oldAdoptionRate = await this.dashboardService.adpotionRate(
        prevStartDate,
        prevEndDate,
        orgId,
      );
      response = this.dashboardService.buildMetricResponse(
        response,
        newAdoptionRate,
        oldAdoptionRate,
      );
      response.metric = DashboardMetricsEnums.ADOPTION_RATE;
    }

    return response;
  }

  @Get('retention')
  async retention(@Query() query: DashboardDto, @User('orgId') orgId: string) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const type = query.type;

    const diff = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - diff);
    const prevEndDate = new Date(endDate.getTime() - diff);

    let response: Partial<DashboardData> = {};

    if (type === DashboardMetricsEnums.ACTIVE_USERS) {
      const newActiveUsersCount = await this.dashboardService.activeUsers(
        startDate,
        endDate,
        orgId,
      );
      const oldActiveUsersCount = await this.dashboardService.activeUsers(
        prevStartDate,
        prevEndDate,
        orgId,
      );
      response = this.dashboardService.buildMetricResponse(
        response,
        newActiveUsersCount,
        oldActiveUsersCount,
      );
      response.metric = DashboardMetricsEnums.ACTIVE_USERS;
    } else if (type === DashboardMetricsEnums.TOTAL_USERS) {
      const newActiveUsers = await this.dashboardService.totalActiveSubscriptions(
        startDate,
        endDate,
        orgId,
      );
      const oldActiveUsers = await this.dashboardService.totalActiveSubscriptions(
        prevStartDate,
        prevEndDate,
        orgId,
      );
      response = this.dashboardService.buildMetricResponse(
        response,
        newActiveUsers,
        oldActiveUsers,
      );
      response.metric = DashboardMetricsEnums.TOTAL_USERS;
    } else if (type === DashboardMetricsEnums.STICKINESS) {
      // DAO - total number of users who played at least one game of a given day(today by default )
      // MAO - total number of users who played at least 1 game in the given month(by default the current month or last 30 days)
      // Stickiness is generally calculated as the ratio of Daily Active Users to Monthly Active Users
      const noOfDaysInMonth = this.statsService.getDaysInMonth(
        startDate.getFullYear(),
        startDate.getMonth(),
      );
      const datesDiff = noOfDaysInMonth - startDate.getDate();

      const monthStartDate = this.statsService.getPastDate(startDate, startDate.getDate() - 1);
      const monthEndDate = this.statsService.getFutureDate(startDate, datesDiff + 1);
      const monthlyActiveUsers = await this.dashboardService.activeUsers(
        monthStartDate,
        monthEndDate,
        orgId,
      );

      const newDailyActiveUsers = await this.dashboardService.activeUsers(
        startDate,
        endDate,
        orgId,
      );
      const newStickiness = newDailyActiveUsers / monthlyActiveUsers;

      const pastDate = this.statsService.getPastDate(startDate, 1);
      const oldDailyActiveUsers = await this.dashboardService.activeUsers(
        pastDate,
        startDate,
        orgId,
      );
      const oldStickiness = oldDailyActiveUsers / monthlyActiveUsers;

      response = this.dashboardService.buildMetricResponse(response, newStickiness, oldStickiness);
      response.metric = DashboardMetricsEnums.STICKINESS;
    }

    return response;
  }
}
