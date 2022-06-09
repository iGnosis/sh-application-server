import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { gql } from 'graphql-request';
import { CronService } from 'src/cron/cron.service';
import { GqlService } from 'src/services/gql/gql.service';
import { EventsService } from '../events.service';
import { SessionEventTriggerDto } from './session.dto';

@Controller('events/session')
export class SessionController {
  constructor(
    private eventsService: EventsService,
    private gqlService: GqlService,
    private cronService: CronService,
  ) {}

  @HttpCode(200)
  @Post('complete')
  async sessionComplete(@Body() body: SessionEventTriggerDto) {
    const { endedAt, patientId } = body;

    if (endedAt === null) {
      return;
    }
    const fetchUserSessionByDay = gql`
      query MyQuery(
        $patientId: uuid = ""
        $startDate: timestamptz = ""
        $endDate: timestamptz = ""
      ) {
        session(
          where: {
            patient: { _eq: $patientId }
            _and: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              _and: { endedAt: { _is_null: false } }
            }
          }
        ) {
          createdAt
          endedAt
        }
      }
    `;

    const startDate = new Date(new Date(endedAt).setUTCHours(0, 0, 0, 0));
    const endDate = new Date(new Date(endedAt).setUTCHours(23, 59, 59, 999));

    try {
      const response = await this.gqlService.client.request(fetchUserSessionByDay, {
        patientId,
        startDate,
        endDate,
      });

      const sessions: { createdAt: string; endedAt: string }[] = response.session;
      let sessionDuration = 0;
      for (let i = 0; i < sessions.length; i++) {
        sessionDuration += this.calcIndividualSessionDuration(
          sessions[i].endedAt,
          sessions[i].createdAt,
        );
      }
      const sessionDurationInMins = this.millisToMinutes(sessionDuration);

      const putEventsResponse = await this.eventsService.startSessionCompleteJourney(
        patientId,
        sessionDurationInMins,
      );
      return putEventsResponse;
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
