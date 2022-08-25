import { Logger } from '@nestjs/common';
import {
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

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface PoseDataMessageBody {
  t: number; // unix epoch in ms
  g: string; // game UUID
  u: string; // user UUID
  p: PoseLandmark[];
}

interface GameEndedBody {
  userId: string;
  gameId: string;
}

// @WebSocketGateway(9001, { namespace: 'pose-data' })
@WebSocketGateway({ cors: true })
export class PoseDataGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger('PoseDataGateway');

  afterInit(server: any) {
    this.logger.log('Gateway Initialized');
  }

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() body: PoseDataMessageBody): Promise<WsResponse<string>> {
    // console.log('[RECV] message', body);

    const downloadsDir = join(process.cwd(), 'pose-documents');
    const fileName = `${body.u}.${body.g}.json`;
    const filePath = join(downloadsDir, fileName);

    const dirContents = await fs.readdir(downloadsDir);
    // if file does not exist.
    if (!dirContents.includes(fileName)) {
      // open/create the json file in append mode
      const initJsonFile = await fs.readFile(filePath, { flag: 'a+' });
      if (initJsonFile.length === 0) {
        await fs.writeFile(filePath, '[]');
      }
    }

    // read existing data
    const rawData = await fs.readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    parsedData.push(body);

    // save the file
    const stringifiedData = JSON.stringify(parsedData);
    await fs.writeFile(filePath, stringifiedData);

    return { event: 'message', data: 'success' };
  }

  @SubscribeMessage('game-end')
  async handleEnd(@MessageBody() body: GameEndedBody): Promise<WsResponse<string>> {
    console.log('handleEnd:body', body);

    const downloadsDir = join(process.cwd(), 'pose-documents');
    const fileName = `${body.userId}.${body.gameId}.json`;
    const filePath = join(downloadsDir, fileName);

    // TODO: save file to S3 on 'ended' message.
    // TODO: clean up the file from the server.

    // create a service for S3 methods
    // if file exists
    // upload that file to S3

    return { event: 'message', data: 'success' };
  }
}
