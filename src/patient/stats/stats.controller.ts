import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
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
  @Get('daily-goals')
  async dailyGoals(@Query('date') date: string, @User() userId: string) {
    // returns the number of minutes a patient did a session on said day. can be >30min
    const dailyGoalDate = new Date(date);
    if (dailyGoalDate.toString() === 'Invalid Date') {
      throw new HttpException('Invalid Date', HttpStatus.BAD_REQUEST);
    }

    // Vignesh's account
    if (userId === 'd8ca4a7b-3335-49ed-865b-fac5b86622a3') {
      if (date === '2022-06-17') {
        return { dailyMinutesCompleted: 19 };
      } else if (date === '2022-06-16') {
        return { dailyMinutesCompleted: 34 };
      } else if (date === '2022-06-15') {
        return { dailyMinutesCompleted: 30 };
      } else if (date === '2022-05-01') {
        return { dailyMinutesCompleted: 25 };
      }
    }

    const oneDayInFuture = this.statsService.getFutureDate(dailyGoalDate, 1);

    console.log('startDateStr:', dailyGoalDate);
    console.log('endDateStr:', oneDayInFuture);
    const results = await this.statsService.sessionDuration(userId, dailyGoalDate, oneDayInFuture);
    console.log(results);

    if (!results || !Array.isArray(results) || results.length === 0) {
      return { dailyMinutesCompleted: 0 };
    }

    const sessionDurations = results.map((result) => result.sessionDurationInMin);
    const totalDailyDuration = sessionDurations.reduce((total, num) => (total += num), 0);
    return { dailyMinutesCompleted: totalDailyDuration };
  }

  @HttpCode(200)
  @Get('streak')
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
