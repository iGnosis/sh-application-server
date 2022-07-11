import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { StatsService } from 'src/patient/stats/stats.service';
import { GqlService } from 'src/services/gql/gql.service';
import { EventsService } from '../events.service';
import { SessionEventTriggerDto } from './session.dto';

// console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

@Controller('events/session')
export class SessionController {
  constructor(
    private eventsService: EventsService,
    private statsService: StatsService,
    private gqlService: GqlService,
  ) {}

  @HttpCode(200)
  @Post('complete')
  async sessionComplete(@Body() body: SessionEventTriggerDto) {
    const { endedAt, patientId } = body;

    if (endedAt === null) {
      return;
    }

    // get patient's timezone
    const query = `query GetPatientTz($patientId: uuid!) {
      patient_by_pk(id: $patientId) {
        timezone
      }
    }`;

    const tzResult: {
      patient_by_pk: {
        timezone: string;
      };
    } = await this.gqlService.client.request(query, { patientId });

    // Workaround until we start storing patient's timezones.
    let timezone: string;
    if (!tzResult || !tzResult.patient_by_pk || !tzResult.patient_by_pk.timezone) {
      timezone = 'Asia/Kolkata';
    } else {
      timezone = tzResult.patient_by_pk.timezone;
    }

    let endedAtDate = new Date(endedAt);
    endedAtDate = new Date(endedAtDate.toLocaleString('en-US', { timeZone: timezone }));

    let startDate = this.statsService.getPastDate(endedAtDate, endedAtDate.getDate());
    startDate = new Date(startDate.setUTCHours(24, 0, 0, 0));

    console.log('startDate:', startDate);
    console.log('endedAtDate:', endedAtDate);

    const monthlyGoalsResult = await this.statsService.getMonthlyGoals(
      patientId,
      startDate,
      endedAtDate,
      timezone,
    );
    console.log('monthlyGoalsResult:', monthlyGoalsResult);

    const monthtlyActiveDays = monthlyGoalsResult.filter(
      (val) => val.createdAtLocaleDate.getDate() === endedAtDate.getDate(),
    );
    let numOfActivitesCompletedToday = 0;

    if (Array.isArray(monthtlyActiveDays) && monthtlyActiveDays.length === 1) {
      numOfActivitesCompletedToday = monthtlyActiveDays[0].activityEndedCount;
    }

    const numOfActiveDays = monthlyGoalsResult.filter((val) => val.activityEndedCount >= 3).length;

    console.log('numOfActivitesCompletedToday:', numOfActivitesCompletedToday);
    console.log('numOfActiveDays:', numOfActiveDays);

    startDate = this.statsService.getPastDate(endedAtDate, 1);
    startDate = new Date(startDate.setUTCHours(24, 0, 0, 0));

    const results = await this.statsService.sessionDuration(patientId, startDate, endedAtDate);
    const sessionDurations = results.map((result) => result.sessionDurationInMin);
    const totalDailyDurationInMin = sessionDurations.reduce((total, num) => (total += num), 0);
    console.log('totalDailyDurationInMin:', totalDailyDurationInMin);

    await this.eventsService.sessionEndedEvent(patientId, {
      numOfActivitesCompletedToday,
      numOfActiveDays,
      totalDailyDurationInMin,
    });
  }
}
