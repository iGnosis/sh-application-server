import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
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
@Controller('patient/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @HttpCode(200)
  @Get('monthly-goals')
  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  async monthyGoals(
    @Query('year') year: number,
    @Query('month') month: number,
    @User() userId: string,
  ) {
    console.log('userId:', userId);

    const monthyGoals = [
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

    return {
      data: monthyGoals,
    };
  }

  @HttpCode(200)
  @Get('daily-goals/:date')
  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  async dailyGoals(@Param('date') date: string, @User() userId: string) {
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

    let dailyMinutesCompleted = 0;
    if (!results || !Array.isArray(results) || results.length === 0) {
      return { dailyMinutesCompleted };
    }

    const sessionDurations = results.map((result) => parseFloat(result.sessionDurationInMs));
    const totalDailyDuration = sessionDurations.reduce((total, num) => (total += num), 0);
    dailyMinutesCompleted = totalDailyDuration / 1000 / 60;
    dailyMinutesCompleted = parseFloat(dailyMinutesCompleted.toFixed(2));
    return { dailyMinutesCompleted };
  }

  @HttpCode(200)
  @Get('streak')
  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  async streak(@User() userId: string) {
    // returns the number of days a patient did sessions consecutively.
    return {
      streak: 4,
    };
  }
}
