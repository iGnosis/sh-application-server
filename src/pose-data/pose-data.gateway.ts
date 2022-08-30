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
import { S3Service } from 'src/services/s3/s3.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseDataMessageBody {
  t: number; // unix epoch in ms
  g: string; // game UUID
  u: string; // user UUID
  p: PoseLandmark[];
}

interface GameEndedBody {
  userId: string;
  gameId: string;
}

// TODO: Refactor this mess.
// @WebSocketGateway(9001, { namespace: 'pose-data' })
@WebSocketGateway({ cors: true })
export class PoseDataGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger('PoseDataGateway');
  private envName: string;

  constructor(private s3Client: S3Service, private configService: ConfigService) {
    this.envName = configService.get('ENV_NAME');
  }

  afterInit(server: any) {
    this.logger.log('Gateway Initialized');
  }

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // const downloadsDir = join(process.cwd(), 'pose-documents');
    // const files = (await fs.readdir(downloadsDir)).filter((fn) => fn.startsWith(client.id));
    // // console.log(files);

    // for (let i = 0; i < files.length; i++) {
    //   const fileName = files[i];
    //   const userId = fileName.split('.')[1];
    //   const gameId = fileName.split('.')[2];
    //   const filePath = join(downloadsDir, fileName);

    //   try {
    //     // upload the file to S3
    //     const readableStream = createReadStream(filePath, { encoding: 'utf-8' });
    //     const command = new PutObjectCommand({
    //       Body: readableStream,
    //       Bucket: 'soundhealth-pose-data',
    //       Key: `${this.envName}/${userId}/${gameId}.json`,
    //       StorageClass: 'STANDARD_IA', // infrequent access
    //     });
    //     await this.s3Client.client.send(command);
    //     console.log('file successfully uploaded to s3');
    //     await fs.unlink(filePath);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }
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

  // @SubscribeMessage('game-end')
  // async handleEnd(
  //   @ConnectedSocket() client: any,
  //   @MessageBody() body: GameEndedBody,
  // ): Promise<WsResponse<string>> {
  //   console.log('handleEnd:body', body);
  // const downloadsDir = join(process.cwd(), 'pose-documents');
  // const fileName = `${client.id}.${body.userId}.${body.gameId}.json`;
  // const filePath = join(downloadsDir, fileName);

  // try {
  //   // upload the file to S3
  //   const readableStream = createReadStream(filePath, { encoding: 'utf-8' });
  //   const command = new PutObjectCommand({
  //     Body: readableStream,
  //     Bucket: 'soundhealth-pose-data',
  //     Key: `${this.envName}/${body.userId}/${body.gameId}.json`,
  //     StorageClass: 'STANDARD_IA', // infrequent access
  //   });
  //   await this.s3Client.client.send(command);
  //   console.log('file successfully uploaded to s3');

  //   // clean up the file after upload
  //   await fs.unlink(filePath);
  // } catch (error) {
  //   console.log(error);
  //   return { event: 'message', data: 'some unknown error' };
  // }
  //   return { event: 'message', data: 'success' };
  // }
}
