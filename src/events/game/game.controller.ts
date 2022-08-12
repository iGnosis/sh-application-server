import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { StatsService } from 'src/patient/stats/stats.service';
import { EventsService } from '../events.service';
import { GameEventTriggerDto } from './game.dto';

// console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

@Controller('events/game')
export class GameController {
  constructor(private eventsService: EventsService, private statsService: StatsService) {}

  // called whenever a 'game' is inserted in the table.
  @Post('start')
  async gameStarted(@Body() body: GameEventTriggerDto) {
    const { patientId, createdAt } = body;
    await this.eventsService.gameStarted(patientId);
    return {
      status: 'success',
      data: {},
    };
  }

  // Call whenever a user lands on Patient Portal.
  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Post('app-accessed')
  async appAccessed(@User() userId: string) {
    await this.eventsService.appAccessed(userId);
    return {
      status: 'success',
    };
  }

  // Called from activity-exp (since it was pain to manage user localtime server-side)
  // on completion of a game.
  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Post('complete')
  async gameComplete(
    @Body('startDate') startDate: Date,
    @Body('currentDate') currentDate: Date,
    @Body('endDate') endDate: Date,
    @Body('userTimezone') userTimezone: string,
    @User() userId: string,
  ) {
    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);

    console.log('startDate:', startDate);
    console.log('endedAtDate:', endDate);

    const { daysCompleted, groupByCreatedAtDayGames } = await this.statsService.getMonthlyGoalsNew(
      userId,
      startDate,
      addOneDayToendDate,
      userTimezone,
    );

    // console.log('groupByCreatedAtDayGames:', groupByCreatedAtDayGames);
    const index = Object.keys(groupByCreatedAtDayGames).length - 1;
    const key = Object.keys(groupByCreatedAtDayGames)[index];
    const latestGameData = groupByCreatedAtDayGames[key];

    const numOfActivitesCompletedToday = latestGameData.length;

    let totalDailyDurationInSec = 0;
    latestGameData.forEach((data) => {
      totalDailyDurationInSec += data.durationInSec;
    });
    const totalDailyDurationInMin = parseFloat((totalDailyDurationInSec / 60).toFixed(2));

    await this.eventsService.gameEnded(userId, {
      numOfActiveDays: daysCompleted,
      numOfActivitesCompletedToday,
      totalDailyDurationInMin: totalDailyDurationInMin,
    });

    console.log('numOfActiveDays:', daysCompleted);
    console.log('numOfActivitesCompletedToday:', numOfActivitesCompletedToday);
    console.log('totalDailyDurationInMin:', totalDailyDurationInMin);

    return {
      status: 'success',
      data: {},
    };
  }
}
