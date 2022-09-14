import { Body, Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common';
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
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('userTimezone') userTimezone: string,
    @User() userId: string,
  ) {
    console.log('userId:', userId);
    // since endDate is exclusive, we add one day.
    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);

    console.log('startDate:', startDate);
    console.log('endDate:', addOneDayToendDate);

    const results = await this.statsService.getMonthlyGoalsNew(
      userId,
      startDate,
      addOneDayToendDate,
      userTimezone,
    );
    const rewardsCountDown = [5, 10, 15];

    if (!results) {
      const response = {
        status: 'success',
        data: {
          daysCompleted: 0,
          rewardsCountDown,
        },
      };
      return response;
    }

    const { daysCompleted, groupByCreatedAtDayGames } = results;
    console.log('groupByCreatedAtDayGames:', groupByCreatedAtDayGames);
    const response = {
      status: 'success',
      data: {
        daysCompleted,
        rewardsCountDown,
      },
    };
    return response;
  }

  @HttpCode(200)
  @Get('streak')
  // for a day to be active, at least 3 activites must be done.
  async streak(@Query('userTimezone') userTimezone: string, @User() userId: string) {
    // Read session for past 30 days each time.
    let days = 30;

    // start date is inclusive - end date is exclusive.
    const now = new Date();
    let startDate = this.statsService.getPastDate(now, days);
    let endDate = this.statsService.getFutureDate(now, 1);
    const streak = 0;

    while (false) {
      // const results = await this.statsService.getMonthlyGoals(
      //   userId,
      //   startDate,
      //   endDate,
      //   userTimezone,
      // );
      // const streakCount = this.statsService.workOutStreak(results);
      // streak += streakCount;
      // // only continue if streakCount is 30 for the current batch of sessions.
      // if (streakCount !== 30) {
      //   break;
      // }
      endDate = startDate;
      days += 30;
      startDate = this.statsService.getPastDate(now, days);
    }
    return { streak };
  }
}
