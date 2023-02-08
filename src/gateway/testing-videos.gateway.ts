import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { CompleteMultipartUploadBody, UploadChunkBody } from 'src/types/global';

/*
Guide:

socket = io(wss://services.dev.pointmotioncontrol.com/testing-videos, {
  query: {
    userId: <>,
    authToken: <>,
  }
})

# Step 1:
  - 'init-multipart-upload'
  - returns:
    - uploadId: res.UploadId,
    - filename: res.Key,

# Step 2:
  - 'upload-chunk'
  - returns:
    - append returned object in an array

# Step 3:
  - 'complete-multipart-upload'
  - input:
    - filename
    - uploadId
    - final array that was created by appending Step2 returned objects
*/

@WebSocketGateway({ cors: true, namespace: 'testing-videos' })
export class TestingVideoGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private BUCKET = 'testers-screen-rec';
  private ENV_NAME: string;

  constructor(
    private readonly logger: Logger,
    private smsAuthSerivce: SmsAuthService,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {
    this.logger = new Logger(TestingVideoGateway.name);
    this.ENV_NAME = this.configService.get('ENV_NAME');
  }

  afterInit(server: any) {
    this.logger.log('TestingVideoGateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const { authToken } = client.handshake.query;

    const payload = this.smsAuthSerivce.verifyWsToken(authToken as string);
    if (!payload) {
      this.logger.error(`Invalid authtoken. Disconnecting client ${client.id}`);
      client.disconnect();
      return;
    }
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('init-multipart-upload')
  async initMultipartUpload(@ConnectedSocket() client: Socket) {
    const { userId } = client.handshake.query;
    try {
      const res = await this.s3Service.createMultipartUpload(
        this.BUCKET,
        `${this.ENV_NAME}/${userId}/${new Date().getTime()}.mp4`,
      );
      client.emit('init-multipart-upload', {
        uploadId: res.UploadId,
        filename: res.Key,
      });
    } catch (err) {
      this.logger.error('error while init multipart upload:: ' + JSON.stringify(err));
    }
  }

  @SubscribeMessage('upload-chunk')
  async uploadChunk(@ConnectedSocket() client: Socket, @MessageBody() body: UploadChunkBody) {
    this.s3Service
      .uploadPart(this.BUCKET, body.filename, body.uploadId, body.partNumber, body.chunk)
      .then((res) => {
        client.emit('upload-chunk', {
          ...res,
        });
        this.logger.log('chunk uploaded');
      })
      .catch((err) => {
        this.logger.error('error while uploading chunk:: ' + JSON.stringify(err));
      });
    // client.emit('upload-chunk', {
    //   PartNumber: body.partNumber,
    //   ETag: res.ETag,
    // });
  }

  @SubscribeMessage('complete-multipart-upload')
  async completeUpload(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CompleteMultipartUploadBody,
  ) {
    try {
      const res = await this.s3Service.completePartUpload(
        this.BUCKET,
        body.filename,
        body.uploadId,
        // body.parts,
      );
      // TODO: create table for keeping urls.
      client.emit('complete-multipart-upload', {
        accessUrl: res.Location,
      });
      this.logger.log('upload complete');
    } catch (err) {
      this.logger.error('error while completing upload:: ' + JSON.stringify(err));
    }
  }
}
