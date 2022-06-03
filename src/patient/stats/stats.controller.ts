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

@Roles(Role.PATIENT)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('patient/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @HttpCode(200)
  @Get('monthly-goals')
  async monthyGoals(
    @Query('year') year: number,
    @Query('month') month: number,
    @User() userId: string,
  ) {
    console.log('userId:', userId);

    // input month ranges: 0-11 (inclusive)
    // add one to have in in the range 1-12
    month = month + 1;

    // prepend '0' if it's just a single digit.
    // ex. '2' -> '02'
    let monthStr = month.toString();
    if (monthStr.length == 1) {
      monthStr = `0${monthStr}`;
    }

    console.log('year:', year);
    console.log('monthStr:', monthStr);

    const startDate = new Date(`${year}-${monthStr}-01`);
    console.log('startDate:', startDate);

    if (startDate.toISOString() === 'Invalid Date') {
      throw new HttpException('Invalid Date', HttpStatus.BAD_REQUEST);
    }

    const numOfDaysInAMonth = new Date(year, month, 0).getDate();
    console.log('numOfDaysInAMonth:', numOfDaysInAMonth);

    let endDate = new Date(startDate);
    endDate = new Date(endDate.setDate(startDate.getDate() + numOfDaysInAMonth));
    console.log('endDate:', endDate);

    const results = await this.statsService.sessionDuration(userId, startDate, endDate);
    console.log('results:', results);

    const mockMonthyGoals = [
      {
        date: '2022-05-01',
        totalSessionDurationInMin: 30,
      },
      {
        date: '2022-05-02',
        totalSessionDurationInMin: 25,
      },
      {
        date: '2022-05-03',
        totalSessionDurationInMin: 45,
      },
      {
        date: '2022-05-04',
        totalSessionDurationInMin: 39,
      },
      {
        date: '2022-05-07',
        totalSessionDurationInMin: 35,
      },
      {
        date: '2022-05-08',
        totalSessionDurationInMin: 10,
      },
      {
        date: '2022-05-09',
        totalSessionDurationInMin: 36,
      },
      {
        date: '2022-05-10',
        totalSessionDurationInMin: 10,
      },
    ];

    // TODO: remove mock later.
    if (!results || !Array.isArray(results) || results.length === 0) {
      return { data: mockMonthyGoals };
    }

    const response = this.statsService.groupByDate(results);

    // sort cronologically - ascending sort w.r.t dates.
    response.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return { data: response };
  }

  @HttpCode(200)
  @Get('daily-goals')
  async dailyGoals(@Query('date') date: string, @User() userId: string) {
    // returns the number of minutes a patient did a session on said day. can be >30min
    const dailyGoalDate = new Date(date);
    if (dailyGoalDate.toString() === 'Invalid Date') {
      throw new HttpException('Invalid Date', HttpStatus.BAD_REQUEST);
    }

    let oneDayInFuture = new Date(date);
    oneDayInFuture = new Date(oneDayInFuture.setDate(dailyGoalDate.getDate() + 1));

    console.log('startDateStr:', dailyGoalDate);
    console.log('endDateStr:', oneDayInFuture);
    const results = await this.statsService.sessionDuration(userId, dailyGoalDate, oneDayInFuture);
    console.log(results);

    // TODO: remove mock later.
    if (!results || !Array.isArray(results) || results.length === 0) {
      return { dailyMinutesCompleted: 21 };
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
    let startDate = new Date(new Date().setDate(now.getDate() - days));
    let endDate = new Date(new Date().setDate(now.getDate() + 1));

    let streak = 0;

    while (true) {
      const results = await this.statsService.sessionDuration(userId, startDate, endDate);
      if (!results || !Array.isArray(results) || results.length === 0) {
        break;
      }

      let groupResultsByDate = this.statsService.groupByDate(results);

      // only consider sessions which lasted for 30 or >= 30mins.
      groupResultsByDate = groupResultsByDate.filter((value) => {
        if (value.totalSessionDurationInMin >= 30) {
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
      startDate = new Date(new Date().setDate(now.getDate() - days));
    }
    return { streak };
  }
}
