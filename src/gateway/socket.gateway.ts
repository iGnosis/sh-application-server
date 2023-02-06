import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Socket } from 'socket.io';
import { PoseDataMessageBody, QaMessageBody } from 'src/types/global';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  InputLogEvent,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GqlService } from 'src/services/clients/gql/gql.service';

@WebSocketGateway({ cors: true })
export class MediapipePoseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  numOfClientsInARoom: { [roomId: string]: number } = {};
  private logEvents: { [key: string]: InputLogEvent[] } = {};
  private cloudwatchClient = new CloudWatchLogsClient({
    credentials: {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    },
    region: this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1',
  });

  constructor(
    private readonly logger: Logger,
    private smsAuthSerivce: SmsAuthService,
    private configService: ConfigService,
    private gqlService: GqlService,
  ) {
    this.logger = new Logger(MediapipePoseGateway.name);
  }

  afterInit(server: any) {
    this.logger.log('Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    const { userId, authToken } = client.handshake.query;

    if (!authToken) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.smsAuthSerivce.verifyToken(authToken as string);
    } catch (err) {
      this.logger.log(err);
      client.disconnect();
      return;
    }

    if (userId) {
      client.join(userId);

      if (Object.keys(this.numOfClientsInARoom).includes(userId as string)) {
        this.numOfClientsInARoom[userId as string]++;
      } else {
        this.numOfClientsInARoom[userId as string] = 1;
      }

      if (this.numOfClientsInARoom[userId as string] >= 2) {
        client.to(userId).emit('qa', {
          event: 'ready',
        });
        // emit to itself.
        client.emit('qa', {
          event: 'ready',
        });
      }
      this.logger.log('numOfClientsInARoom: ' + JSON.stringify(this.numOfClientsInARoom));
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const { userId } = client.handshake.query;
    if (userId) {
      if (Object.keys(this.numOfClientsInARoom).includes(userId as string)) {
        this.numOfClientsInARoom[userId as string]--;
      }
      if (this.numOfClientsInARoom[userId as string] === 0) {
        delete this.numOfClientsInARoom[userId as string];
      }
    }
    this.logger.log('numOfClientsInARoom: ' + JSON.stringify(this.numOfClientsInARoom));
  }

  @SubscribeMessage('qa')
  async handleQaData(@ConnectedSocket() client: Socket, @MessageBody() body: QaMessageBody) {
    const { userId } = client.handshake.query;
    if (userId) {
      client.to(userId).emit('qa', body);
    }
  }

  @SubscribeMessage('posedata')
  async handlePoseData(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: PoseDataMessageBody,
  ): Promise<WsResponse<string>> {
    // console.log('[RECV] client message', body);
    const downloadsDir = join(process.cwd(), 'storage/pose-documents');
    const fileName = `${body.u}.${body.g}.json`;
    const filePath = join(downloadsDir, fileName);
    await fs.writeFile(filePath, `${JSON.stringify(body)}\n`, { encoding: 'utf-8', flag: 'a+' });
    return { event: 'posedata', data: 'success' };
  }

  @SubscribeMessage('cloudwatch-log')
  async handleLogData(
    @ConnectedSocket() socketclient: Socket,
    @MessageBody() body: any,
  ): Promise<WsResponse<string>> {
    const { userId } = socketclient.handshake.query;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    this.logger.log('Socket Log:: ' + body.logs);
    const logStreamName = `${body.portal}_${userId}_${date.toLocaleDateString('en-US')}`;

    if (this.logEvents[logStreamName]) {
      this.logEvents[logStreamName].push({
        message: body.logs,
        timestamp: Date.now(),
      });
    } else {
      this.logEvents[logStreamName] = [
        {
          message: body.logs,
          timestamp: Date.now(),
        },
      ];
    }

    return { event: 'log', data: 'success' };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePendingLogs() {
    if (Object.keys(this.logEvents).length === 0) return;

    for (const logStreamName of Object.keys(this.logEvents)) {
      try {
        const getLogStreamCommand = new DescribeLogStreamsCommand({
          logGroupName: this.configService.get('AWS_LOG_GROUP_NAME') || 'dev-logs',
          logStreamNamePrefix: logStreamName,
        });
        const logStreamData = await this.cloudwatchClient.send(getLogStreamCommand);
        if (logStreamData.logStreams.length === 0) {
          const logStream = new CreateLogStreamCommand({
            logGroupName: this.configService.get('AWS_LOG_GROUP_NAME') || 'dev-logs',
            logStreamName,
          });
          this.cloudwatchClient.send(logStream);
        }
      } catch (err) {
        this.logger.log(err);
      }

      try {
        const logEvent = new PutLogEventsCommand({
          logEvents: this.logEvents[logStreamName],
          logGroupName: this.configService.get('AWS_LOG_GROUP_NAME') || 'dev-logs',
          logStreamName,
        });
        await this.cloudwatchClient.send(logEvent);
      } catch (err) {
        this.logger.log(err);
      }
    }
  }
}
