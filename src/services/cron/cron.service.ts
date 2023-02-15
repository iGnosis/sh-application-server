import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as fs from 'fs/promises';
import { join } from 'path';
import { GqlService } from '../clients/gql/gql.service';
import { EventsService } from '../events/events.service';
import { RbacService } from '../rbac/rbac.service';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';

@Injectable()
export class CronService {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
    private rbacService: RbacService,
    private subscriptionPlanService: SubscriptionPlanService,
    private gqlService: GqlService,
    private eventsService: EventsService,
  ) {
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

  @Cron('0 */20 * * * *')
  async cleanUpRbacCache() {
    const downloadsDir = join(process.cwd(), 'storage/hasura-metadata');
    const dirContents = await fs.readdir(downloadsDir);

    dirContents.forEach(async (file) => {
      if (file.endsWith('.json')) {
        const filePath = join(downloadsDir, file);
        const stat = await fs.stat(filePath);

        const thirtyMinsInMs = 30 * 60 * 1000;
        const now = new Date().getTime();
        const fileCreatedAt = new Date(stat.ctime).getTime() + thirtyMinsInMs;
        if (now > fileCreatedAt) {
          fs.unlink(filePath);
        }
      }
    });
  }

  @Cron('0 */15 * * * *')
  async reloadActionsMetadata() {
    const downloadsDir = join(process.cwd(), 'storage/hasura-metadata');
    const controllersMetadataFilePath = join(downloadsDir, `gql-controllers.json`);
    const hasuraMetadata = await this.rbacService.exportHasuraMetadata();

    const actionsRbac = hasuraMetadata.actions.map((hasuraAction) => {
      let fullUrl = `/${hasuraAction.definition.handler.split('/').splice(1).join('/')}`;
      if (fullUrl.endsWith('/')) {
        // remove trailing `/`
        fullUrl = fullUrl.slice(0, fullUrl.length - 1);
      }
      return {
        name: hasuraAction.name,
        fullUrl,
        roles: hasuraAction.permissions ? hasuraAction.permissions.map((roles) => roles.role) : [],
      };
    });

    const eventTriggerRbac = hasuraMetadata.sources[0].tables.map((table) => {
      if (!table.event_triggers) return [];

      return table.event_triggers.map((eventTrigger) => {
        let fullUrl = `/${eventTrigger.webhook.split('/').splice(1).join('/')}`;
        if (fullUrl.endsWith('/')) {
          // remove trailing `/`
          fullUrl = fullUrl.slice(0, fullUrl.length - 1);
        }
        return {
          name: eventTrigger.name,
          fullUrl,
        };
      });
    });

    const controllerRbac = {
      actions: actionsRbac,
      eventTrigger: eventTriggerRbac.flat(),
    };

    await fs.writeFile(controllersMetadataFilePath, JSON.stringify(controllerRbac), {
      encoding: 'utf-8',
    });
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async generateMonthlyReport() {
    try {
      const query = `
      query GetOrganizations {
        organization {
          id
        }
      }`;
      const resp = await this.gqlService.client.request(query);
      if (!resp || !resp.organization) throw new Error('No organizations found');

      const date = new Date();
      date.setDate(date.getDate() - 1); // last day of previous month

      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      for (const org of resp.organization) {
        const orgId = org.id;
        const report = await this.subscriptionPlanService.generateReport(
          orgId,
          startOfMonth.toISOString(),
          endOfMonth.toISOString(),
        );
        if (!report) continue;
        const { formattedOverview, revenue, ...txtReport } = report;
        await this.subscriptionPlanService.createTxtReport(txtReport);

        if (orgId === '00000000-0000-0000-0000-000000000000') {
          await this.eventsService.sendMonthlyReportEmail(formattedOverview, startOfMonth);
        }
        await this.subscriptionPlanService.saveMonthlyReport(revenue, orgId);
      }
      this.logger.log('Monthly report generated');
    } catch (error) {
      this.logger.error(error);
    }
  }
}
