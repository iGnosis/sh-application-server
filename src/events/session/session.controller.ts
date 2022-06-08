import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { gql } from 'graphql-request';
import { CronService } from 'src/cron/cron.service';
import { GqlService } from 'src/services/gql/gql.service';
import { EventsService } from '../events.service';
import { SessionEndEventDto, SessionEventTriggerDto } from './session.dto';

@Controller('events/session')
export class SessionController {
  constructor(
    private eventsService: EventsService,
    private gqlService: GqlService,
    private cronService: CronService,
  ) {}

  @HttpCode(200)
  @Post('start')
  async sessionStart(@Body() body: SessionEventTriggerDto) {
    const { createdAt, sessionId, patientId } = body;

    const now = new Date();
    const ThreeHoursInFuture = new Date(now.getTime() + 1000 * 60 * 180).toISOString();
    const payload = {
      sessionId,
      createdAt,
      patientId,
    };

    await this.cronService.scheduleOneOffCron(
      ThreeHoursInFuture,
      '/events/session/complete',
      payload,
    );

    console.log('patient-id: ');
  }

  @HttpCode(200)
  @Post('complete')
  async sessionComplete(@Body() body: SessionEndEventDto) {
    const { createdAt, sessionId, patientId } = body.payload;

    const sessionCreatedAt = new Date(createdAt);
    const nowDate = new Date();
    const diffInMins = (nowDate.getTime() - sessionCreatedAt.getTime()) / 1000 / 60;

    if (diffInMins < 180) {
      return;
    }

    const fetchSessions = gql`
      query FetchSessionEvents($sessionId: uuid = "") {
        events(where: { session: { _eq: $sessionId } }, order_by: { created_at: desc }) {
          id
          event_type
          created_at
        }
      }
    `;
    try {
      const response = await this.gqlService.client.request(fetchSessions, { sessionId });
      const totalLen = response.events.length;
      if (response.events.length > 0) {
        const sessionDurationInMillis =
          response.events[0].created_at - response.events[totalLen - 1].created_at;
        const sessionDurationInMins = this.millisToMinutes(sessionDurationInMillis);
        await this.eventsService.startSessionCompleteJourney(patientId, sessionDurationInMins);
      }
    } catch (err) {
      console.log('Error', err);
    }
  }

  millisToMinutes(millis: number) {
    const minutes = Math.floor(millis / 60000);
    // const seconds = parseInt(((millis % 60000) / 1000).toFixed(0));
    return minutes;
  }
}
