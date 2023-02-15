import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  InputLogEvent,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LogReportService {
  private logEvents: { [key: string]: InputLogEvent[] } = {};
  private cloudwatchClient = new CloudWatchLogsClient({
    region: this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1',
  });

  constructor(private configService: ConfigService) {}

  reportLog(logs: string) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const logStreamName = `${date.toLocaleDateString('en-US')}`;

    if (this.logEvents[logStreamName]) {
      this.logEvents[logStreamName].push({
        message: logs,
        timestamp: Date.now(),
      });
    } else {
      this.logEvents[logStreamName] = [
        {
          message: logs,
          timestamp: Date.now(),
        },
      ];
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handlePendingLogs() {
    if (
      Object.keys(this.logEvents).length === 0 ||
      !this.configService.get('AWS_SERVER_LOG_GROUP_NAME')
    )
      return;

    for (const logStreamName of Object.keys(this.logEvents)) {
      try {
        const getLogStreamCommand = new DescribeLogStreamsCommand({
          logGroupName: this.configService.get('AWS_SERVER_LOG_GROUP_NAME'),
          logStreamNamePrefix: logStreamName,
        });
        const logStreamData = await this.cloudwatchClient.send(getLogStreamCommand);
        if (logStreamData.logStreams.length === 0) {
          const logStream = new CreateLogStreamCommand({
            logGroupName: this.configService.get('AWS_SERVER_LOG_GROUP_NAME'),
            logStreamName,
          });
          this.cloudwatchClient.send(logStream);
        }
      } catch (err) {}

      try {
        const logEvent = new PutLogEventsCommand({
          logEvents: this.logEvents[logStreamName],
          logGroupName: this.configService.get('AWS_SERVER_LOG_GROUP_NAME'),
          logStreamName,
        });
        await this.cloudwatchClient.send(logEvent);
        delete this.logEvents[logStreamName];
      } catch (err) {}
    }
  }
}
