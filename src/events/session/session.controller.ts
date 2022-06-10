import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CronService } from 'src/cron/cron.service';
import { StatsService } from 'src/patient/stats/stats.service';
import { GqlService } from 'src/services/gql/gql.service';
import { EventsService } from '../events.service';
import { SessionEventTriggerDto } from './session.dto';

@Controller('events/session')
export class SessionController {
  constructor(
    private eventsService: EventsService,
    private gqlService: GqlService,
    private cronService: CronService,
    private statsService: StatsService,
  ) {}

  @HttpCode(200)
  @Post('complete')
  async sessionComplete(@Body() body: SessionEventTriggerDto) {
    const { endedAt, patientId } = body;

    if (endedAt === null) {
      return;
    }
    const dailyGoalDate = new Date(new Date(endedAt).toISOString().split('T')[0]);
    const oneDayInFuture = this.statsService.getFutureDate(dailyGoalDate, 1);

    console.log('startDateStr:', dailyGoalDate);
    console.log('endDateStr:', oneDayInFuture);
    try {
      const results = await this.statsService.sessionDuration(
        patientId,
        dailyGoalDate,
        oneDayInFuture,
      );

      const sessionDurations = results.map((result) => result.sessionDurationInMin);
      const totalDailyDurationInMin = sessionDurations.reduce((total, num) => (total += num), 0);

      if (totalDailyDurationInMin < 30) {
        const putEventsResponse = await this.eventsService.startSessionCompleteJourney(
          patientId,
          totalDailyDurationInMin,
        );
        return putEventsResponse;
      }
    } catch (err) {
      console.log('Error', err);
    }
  }

  calcIndividualSessionDuration(endedAt: string, createdAt: string) {
    const diff = new Date(endedAt).getTime() - new Date(createdAt).getTime();
    return diff;
  }

  millisToMinutes(millis: number) {
    const minutes = Math.floor(millis / 60000);
    // const seconds = parseInt(((millis % 60000) / 1000).toFixed(0));
    return minutes;
  }
}
