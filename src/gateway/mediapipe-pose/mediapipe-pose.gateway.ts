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
import { PoseDataMessageBody } from 'src/types/global';

@WebSocketGateway({ cors: true })
export class MediapipePoseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly logger: Logger) {
    this.logger = new Logger(MediapipePoseGateway.name);
  }

  afterInit(server: any) {
    this.logger.log('Gateway Initialized');
  }

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: any,
    @MessageBody() body: PoseDataMessageBody,
  ): Promise<WsResponse<string>> {
    // console.log('[RECV] client message', body);
    const downloadsDir = join(process.cwd(), 'pose-documents');
    const fileName = `${body.u}.${body.g}.json`;
    const filePath = join(downloadsDir, fileName);
    await fs.writeFile(filePath, `${JSON.stringify(body)}\n`, { encoding: 'utf-8', flag: 'a+' });
    return { event: 'message', data: 'success' };
  }
}
