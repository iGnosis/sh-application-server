import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { User } from 'src/auth/decorators/user.decorator';
import { StatsService } from 'src/patient/stats/stats.service';
import { EventsService } from '../events.service';
import { GameEventTriggerDto } from './game.dto';

// console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

@Controller('events/game')
export class GameController {
  constructor(private eventsService: EventsService, private statsService: StatsService) {}

  // TODO:
  // create an event for this
  // called when a 'game' is inserted
  @Post('start')
  async gameStarted(@Body() body: GameEventTriggerDto) {
    const { patientId, createdAt } = body;
    await this.eventsService.sessionStarted(patientId);
    return {
      status: 'success',
      data: {},
    };
  }

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

    let numOfActivitesCompletedToday: number;
    let totalDailyDurationInSec: number;

    for (const [createdAtDay, gamesArr] of Object.entries(groupByCreatedAtDayGames)) {
      // if it matches the current day.
      if (new Date(createdAtDay).getTime() - new Date(currentDate).getTime() === 0) {
        numOfActivitesCompletedToday = gamesArr.length;
        gamesArr.forEach((val) => {
          totalDailyDurationInSec += val.durationInSec;
        });
      }
    }

    const totalDailyDurationInMin = parseFloat((totalDailyDurationInSec / 60).toFixed(2));

    await this.eventsService.sessionEndedEvent(userId, {
      numOfActiveDays: daysCompleted,
      numOfActivitesCompletedToday,
      totalDailyDurationInMin: totalDailyDurationInMin,
    });

    return {
      status: 'success',
      data: {},
    };
  }
}
