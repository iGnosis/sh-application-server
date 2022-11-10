import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
@Injectable()
export class CronService {
  constructor(private configService: ConfigService, private readonly logger: Logger) {
    this.logger = new Logger(CronService.name);
  }

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
    this.logger.debug('scheduleCron:hasuraQueryEp: ' + JSON.stringify(scheduleEventBody));

    const scheduleReq = await axios.post(hasuraQueryEp, JSON.stringify(scheduleEventBody), {
      headers: {
        'x-hasura-admin-secret': this.configService.get('GQL_API_ADMIN_SECRET'),
      },
    });
    this.logger.debug('scheduleCron:response: ' + JSON.stringify(scheduleReq.data));
  }
}
