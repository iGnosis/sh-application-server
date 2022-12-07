import { Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { StatsService } from '../../services/patient-stats/stats.service';

@Roles(UserRole.PATIENT, UserRole.BENCHMARK)
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
    @User('id') userId: string,
  ) {
    // console.log('userId:', userId);
    // since endDate is exclusive, we add one day.
    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);

    // console.log('startDate:', startDate);
    // console.log('endDate:', addOneDayToendDate);

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
    // console.log('groupByCreatedAtDayGames:', groupByCreatedAtDayGames);
    const response = {
      status: 'success',
      data: {
        daysCompleted,
        rewardsCountDown,
      },
    };
    return response;
  }
}
