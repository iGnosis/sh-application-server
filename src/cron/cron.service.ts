import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
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
}
