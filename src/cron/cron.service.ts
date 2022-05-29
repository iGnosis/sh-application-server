import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { gql } from 'graphql-request';
import { GqlService } from 'src/services/gql/gql.service';
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private configService: ConfigService, private gqlService: GqlService) {}

  async scheduleOneOffCron(scheduleAt: string, apiEndpoint: string, payload = {}, comment = '') {
    const scheduleEventBody = {
      type: 'create_scheduled_event',
      args: {
        webhook: new URL(apiEndpoint, this.configService.get('APP_SERVER_URL')).href,
        schedule_at: scheduleAt,
        payload,
        comment,
      },
    };

    const hasuraQueryEp = this.configService.get('HASURA_QUERY_ENDPOINT');
    this.logger.debug('scheduleCron:hasuraQueryEp:', scheduleEventBody);

    const scheduleReq = await axios.post(hasuraQueryEp, JSON.stringify(scheduleEventBody), {
      headers: {
        'x-hasura-admin-secret': this.configService.get('GQL_API_ADMIN_SECRET'),
      },
    });
    this.logger.debug('scheduleCron:response:', scheduleReq.data);
  }

  async inspectSession(sessionId: string) {
    const fetchSession = gql`
      query FetchSessionEvents($sessionId: uuid = "") {
        events(where: { session: { _eq: $sessionId } }, order_by: { created_at: desc }) {
          id
          event_type
          created_at
        }
      }
    `;

    const response = await this.gqlService.client.request(fetchSession, { sessionId });

    // if no events for the session.
    if (!response || !Array.isArray(response.events) || !response.events.length) {
      this._markSessionStatus(sessionId, 'trashed');
      return;
    }

    // if the session does not have any data for a rep.
    const eventTypes = new Set(response.events.map((event) => event.event_type));
    if (!eventTypes.has('taskEnded')) {
      await this._markSessionStatus(sessionId, 'trashed');
      return;
    }

    // sessions are sorted in reverse cronological order.
    const createdAtDates = response.events.map((event) => event.created_at);

    const lastestEventDate = createdAtDates[0];
    const earliestEventDate = createdAtDates[createdAtDates.length - 1];
    const diffInMinutes = (lastestEventDate - earliestEventDate) / 1000 / 60;

    // sessions which lasted for >= 30mins are considered as completed.
    if (diffInMinutes < 30) {
      await this._markSessionStatus(sessionId, 'partiallycompleted');
    } else {
      await this._markSessionStatus(sessionId, 'completed');
    }
  }

  async _markSessionStatus(sessionId: string, status: string) {
    const query = gql`
      mutation SetSessionStatus($sessionId: uuid = "", $status: session_type_enum) {
        update_session_by_pk(pk_columns: { id: $sessionId }, _set: { status: $status }) {
          id
        }
      }
    `;
    await this.gqlService.client.request(query, { sessionId, status });
  }
}
