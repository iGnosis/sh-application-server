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

@WebSocketGateway({ cors: true })
export class MediapipePoseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  numOfClientsInARoom: { [roomId: string]: number } = {};

  constructor(private readonly logger: Logger, private smsAuthSerivce: SmsAuthService) {
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
      // only a patient can init a WS connection.
      if (payload['https://hasura.io/jwt/claims']['x-hasura-default-role'] !== 'patient') {
        client.disconnect();
        return;
      }
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
}
