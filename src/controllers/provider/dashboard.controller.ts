import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { DashboardService } from 'src/services/provider/dashboard/dashboard.service';
import { DashboardDto } from './dashbaord.dto';
import { DashboardData } from 'src/types/global';
import { DashboardMetricEnum } from 'src/types/enum';
import { StatsService } from 'src/services/patient-stats/stats.service';

@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseInterceptors(new TransformResponseInterceptor())
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private statsService: StatsService,
    private logger: Logger,
  ) {}

  @Get('conversion')
  async conversion(@Query() query: DashboardDto, @User('orgId') orgId: string) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const type = query.type;

    const diff = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - diff);
    const prevEndDate = new Date(endDate.getTime() - diff);

    let response: Partial<DashboardData> = {};

    if (type == DashboardMetricEnum.NEW_USERS) {
      const p1 = this.dashboardService.newUsers(startDate, endDate, orgId);
      const p2 = this.dashboardService.newUsers(prevStartDate, prevEndDate, orgId);
      const [newCount, oldCount] = await Promise.all([p1, p2]);
      response = this.dashboardService.buildMetricResponse(response, newCount, oldCount);
      response.metric = DashboardMetricEnum.NEW_USERS;
      response.tooltip = '';
    } else if (type == DashboardMetricEnum.ACTIVATION_MILESTONE) {
      const p1 = this.dashboardService.activationMilestone(startDate, endDate, orgId);
      const p2 = this.dashboardService.activationMilestone(prevStartDate, prevEndDate, orgId);
      const [newCount, oldCount] = await Promise.all([p1, p2]);
      response = this.dashboardService.buildMetricResponse(response, newCount, oldCount);
      response.metric = DashboardMetricEnum.ACTIVATION_MILESTONE;
      response.tooltip =
        'A milestone for users that marks their activation within the system. Typically, this milestone is achieved by completing a specific action, here: running their first activity.';
    } else if (type == DashboardMetricEnum.ACTIVATION_RATE) {
      const p1 = this.dashboardService.newUsers(startDate, endDate, orgId);
      const p2 = this.dashboardService.newUsers(prevStartDate, prevEndDate, orgId);
      const p3 = this.dashboardService.activationMilestone(startDate, endDate, orgId);
      const p4 = this.dashboardService.activationMilestone(prevStartDate, prevEndDate, orgId);

      const [
        newUsersCount,
        oldUsersCount,
        newActivationMilestoneCount,
        oldActivationMilestoneCount,
      ] = await Promise.all([p1, p2, p3, p4]);

      const newActivationRate = (newActivationMilestoneCount / newUsersCount) * 100;
      const oldActivationRate = (oldActivationMilestoneCount / oldUsersCount) * 100;

      response = this.dashboardService.buildMetricResponse(
        response,
        newActivationRate,
        oldActivationRate,
      );
      response.metric = DashboardMetricEnum.ACTIVATION_RATE;
      response.tooltip =
        'The percentage of users who have successfully completed the activation milestone or point, here: running their first activity.';
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

    if (type === DashboardMetricEnum.AVG_USER_ENGAGEMENT) {
      // Average user engagement is total time of game play divided by total number of active subscriptions
      const newActiveSubsPromise = this.dashboardService.totalActiveSubscriptions(
        startDate,
        endDate,
        orgId,
      );
      const oldActiveSubsPromise = this.dashboardService.totalActiveSubscriptions(
        prevStartDate,
        prevEndDate,
        orgId,
      );
      const newTotalGameplayDurationPromise = this.dashboardService.totalGamePlayDurationMin(
        startDate,
        endDate,
        orgId,
      );
      const oldTotalGameplayDurationPromise = this.dashboardService.totalGamePlayDurationMin(
        prevStartDate,
        prevEndDate,
        orgId,
      );

      const [
        newActiveSubs,
        oldActiveSubs,
        newTotalGameplayDurationMin,
        oldTotalGameplayDurationMin,
      ] = await Promise.all([
        newActiveSubsPromise,
        oldActiveSubsPromise,
        newTotalGameplayDurationPromise,
        oldTotalGameplayDurationPromise,
      ]);

      const newAvgUserEngagement = newTotalGameplayDurationMin / newActiveSubs;
      const oldAvgUserEngagement = oldTotalGameplayDurationMin / oldActiveSubs;

      response = this.dashboardService.buildMetricResponse(
        response,
        newActiveSubs !== 0 ? newAvgUserEngagement : 0, // to rule out divide by zero
        oldActiveSubs !== 0 ? oldAvgUserEngagement : 0,
      );
      response.metric = DashboardMetricEnum.AVG_USER_ENGAGEMENT;
      response.tooltip =
        'This metric is used to measure the duration of user interaction and participation in gameplay over a certain period of time.';
    } else if (type === DashboardMetricEnum.AVG_ACTIVITIES_PLAYED) {
      // TODO: get activity count dynamically!
      const numOfActivities = 4;

      const p1 = this.dashboardService.gamesPlayedCount(startDate, endDate, orgId);
      const p2 = this.dashboardService.gamesPlayedCount(prevStartDate, prevEndDate, orgId);

      const [newGamesPlayedCount, oldGamesPlayedCount] = await Promise.all([p1, p2]);
      const newAvgActivitiesPlayed = newGamesPlayedCount / numOfActivities;
      const oldAvgActivitiesPlayed = oldGamesPlayedCount / numOfActivities;

      response = this.dashboardService.buildMetricResponse(
        response,
        newAvgActivitiesPlayed,
        oldAvgActivitiesPlayed,
      );
      response.metric = DashboardMetricEnum.AVG_ACTIVITIES_PLAYED;
      response.tooltip =
        'This metric is used to measure the number of games played over a certain period of time.';
    } else if (type === DashboardMetricEnum.ADOPTION_RATE) {
      const p1 = this.dashboardService.adpotionRate(startDate, endDate, orgId);
      const p2 = this.dashboardService.adpotionRate(prevStartDate, prevEndDate, orgId);
      const [newAdoptionRate, oldAdoptionRate] = await Promise.all([p1, p2]);
      response = this.dashboardService.buildMetricResponse(
        response,
        newAdoptionRate,
        oldAdoptionRate,
      );
      response.metric = DashboardMetricEnum.ADOPTION_RATE;
      response.tooltip =
        'This metric is used to measure the rate at which users are adopting the platform';
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

    if (type === DashboardMetricEnum.ACTIVE_USERS) {
      const p1 = this.dashboardService.activeUsers(startDate, endDate, orgId);
      const p2 = this.dashboardService.activeUsers(prevStartDate, prevEndDate, orgId);
      const [newActiveUsersCount, oldActiveUsersCount] = await Promise.all([p1, p2]);
      response = this.dashboardService.buildMetricResponse(
        response,
        newActiveUsersCount,
        oldActiveUsersCount,
      );
      response.metric = DashboardMetricEnum.ACTIVE_USERS;
      response.tooltip =
        'The number of users who have engaged with the platform within a certain period of time.';
    } else if (type === DashboardMetricEnum.TOTAL_USERS) {
      const p1 = this.dashboardService.totalActiveSubscriptions(startDate, endDate, orgId);
      const p2 = this.dashboardService.totalActiveSubscriptions(prevStartDate, prevEndDate, orgId);
      const [newActiveUsers, oldActiveUsers] = await Promise.all([p1, p2]);
      response = this.dashboardService.buildMetricResponse(
        response,
        newActiveUsers,
        oldActiveUsers,
      );
      response.metric = DashboardMetricEnum.TOTAL_USERS;
      response.tooltip = '';
    } else if (type === DashboardMetricEnum.STICKINESS) {
      // DAO - total number of users who played at least one game of a given day(today by default )
      // MAO - total number of users who played at least 1 game in the given month(by default the current month or last 30 days)
      // Stickiness is generally calculated as the ratio of Daily Active Users to Monthly Active Users
      const noOfDaysInMonth = this.statsService.getDaysInMonth(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
      );
      this.logger.log('STICKINESS:noOfDaysInMonth: ' + noOfDaysInMonth);

      const pastDate = this.statsService.getPastDate(startDate, 1);
      this.logger.log('STICKINESS:startDate: ' + startDate.toISOString());
      this.logger.log('STICKINESS:endDate: ' + endDate.toISOString());
      this.logger.log('STICKINESS:pastDate: ' + pastDate.toISOString());

      const monthStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      this.logger.log('STICKINESS:monthStartDate: ' + monthStartDate.toISOString());

      // last date is exclusive.
      const monthEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      this.logger.log('STICKINESS:monthEndDate: ' + monthEndDate.toISOString());

      const p1 = this.dashboardService.activeUsers(monthStartDate, monthEndDate, orgId);
      const p2 = this.dashboardService.activeUsers(startDate, endDate, orgId);
      const p3 = this.dashboardService.activeUsers(pastDate, startDate, orgId);

      const [monthlyActiveUsers, newDailyActiveUsers, oldDailyActiveUsers] = await Promise.all([
        p1,
        p2,
        p3,
      ]);

      this.logger.log('STICKINESS:monthlyActiveUsers: ' + monthlyActiveUsers);
      this.logger.log('STICKINESS:newDailyActiveUsers: ' + newDailyActiveUsers);
      this.logger.log('STICKINESS:oldDailyActiveUsers: ' + oldDailyActiveUsers);

      const newStickiness = newDailyActiveUsers / monthlyActiveUsers;
      this.logger.log('STICKINESS:newStickiness: ' + newStickiness);

      const oldStickiness = oldDailyActiveUsers / monthlyActiveUsers;
      this.logger.log('STICKINESS:oldStickiness: ' + oldStickiness);

      response = this.dashboardService.buildMetricResponse(response, newStickiness, oldStickiness);
      response.metric = DashboardMetricEnum.STICKINESS;
      response.tooltip =
        'The ratio of active users to total users within a specific time frame. High stickiness metric indicates that users are finding value (repeated value) and are likely to continue using it in the future.';
    }

    return response;
  }
}
