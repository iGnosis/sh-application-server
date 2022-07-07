import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { DailyGoalsDto } from './stats.dto';
import { StatsService } from './stats.service';

@Roles(Role.PATIENT, Role.PLAYER)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('patient/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @HttpCode(200)
  @Get('monthly-goals')
  async monthyGoals(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('userTimezone') userTimezone: string,
    @User() userId: string,
  ) {
    console.log('userId:', userId);
    // since endDate is exclusive, we add one day.
    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);
    const results = await this.statsService.getMonthlyGoals(
      userId,
      startDate,
      addOneDayToendDate,
      userTimezone,
    );
    console.log('monthyGoals:results:', results);
    const daysCompleted = results.filter((val) => val.activityEndedCount >= 3).length;
    const response = {
      status: 'success',
      data: {
        daysCompleted,
        rewardsCountDown: [5, 10, 15],
      },
    };
    return response;
  }

  @HttpCode(200)
  @Post('daily-goals')
  async dailyGoals(@Body() inputData: DailyGoalsDto, @User() userId: string) {
    console.log('userId:', userId);
    const startDate = new Date(inputData.input.date);
    let activityIds = inputData.input.activityIds;
    // workaround when there's just single activity ID.
    if (typeof activityIds === 'string') {
      activityIds = [activityIds];
    }
    const endDate = this.statsService.getFutureDate(startDate, 1);
    const results = await this.statsService.getDailyGoals(userId, activityIds, startDate, endDate);
    const completedActivityIds = results.map((val) => val.activity);
    const response = {
      status: 'success',
      data: {
        activities: [],
      },
    };
    activityIds.forEach((reqActivityId) => {
      response.data.activities.push({
        id: reqActivityId,
        isCompleted: completedActivityIds.includes(reqActivityId),
      });
    });
    return response;
  }

  @HttpCode(200)
  @Get('streak')
  // TODO: Implement newer version of streak API.
  // Atleast 3 activites should be done in a day.
  async streak(@User() userId: string) {
    // returns the number of days a patient did sessions consecutively.

    // Read session for past 30 days each time.
    let days = 30;

    // start date is inclusive - end date is exclusive.
    const now = new Date();
    let startDate = this.statsService.getPastDate(now, days);
    let endDate = this.statsService.getFutureDate(now, 1);
    let streak = 0;

    while (true) {
      const results = await this.statsService.sessionDuration(userId, startDate, endDate);
      if (!results || !Array.isArray(results) || results.length === 0) {
        break;
      }

      let groupResultsByDate = this.statsService.groupByDate(results);

      // only consider sessions which lasted for 1 or >= 1mins.
      groupResultsByDate = groupResultsByDate.filter((value) => {
        if (value.totalSessionDurationInMin >= 1) {
          return true;
        }
      });

      if (!groupResultsByDate || groupResultsByDate.length === 0) {
        break;
      }

      // sort in reverse cronological order.
      groupResultsByDate.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      const streakCount = this.statsService.workOutStreak(groupResultsByDate);
      streak += streakCount;

      // only continue if streakCount is 30 for the current batch of sessions.
      if (streakCount !== 30) {
        break;
      }

      endDate = startDate;
      days += 30;
      startDate = this.statsService.getPastDate(now, days);
    }
    return { streak };
  }
}
