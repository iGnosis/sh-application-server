import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { StsService } from 'src/services/clients/sts/sts.service';
import { TesterVideosService } from 'src/services/tester-videos/tester-videos.service';

@ApiBearerAuth('access-token')
@UseInterceptors(new TransformResponseInterceptor())
@Controller('tester-videos')
export class TesterVideosController {
  private BUCKET = 'testers-screen-rec';
  private ENV_NAME: string;

  constructor(
    private stsService: StsService,
    private readonly logger: Logger,
    private configService: ConfigService,
    private s3Service: S3Service,
    private testerVideosService: TesterVideosService,
  ) {
    this.logger = new Logger(TesterVideosController.name);
    this.ENV_NAME = this.configService.get('ENV_NAME');
  }

  @Get('upload-video-creds')
  async uploadVideoUrl(@User('id') userId: string) {
    const folder = `${this.ENV_NAME}/${userId}/${new Date().toISOString()}`;
    const credentials = await this.stsService.putObjStsAssumeRole(this.BUCKET, folder);

    return { credentials, folder: folder, bucket: this.BUCKET };
  }

  @Get('view-recording')
  async viewRecordings(@User('orgId') orgId: string, @Query('recordingId') recordingId: string) {
    const recording = await this.testerVideosService.getRecording(recordingId);

    if (recording.organization !== orgId) {
      throw new HttpException('Access Denied', HttpStatus.FORBIDDEN);
    }

    const p1 = this.s3Service.getObjectedSignedUrl(this.BUCKET, recording.configKey);
    const p2 = this.s3Service.getObjectedSignedUrl(this.BUCKET, recording.videoKey);
    const [configUrl, videoUrl] = await Promise.all([p1, p2]);

    return {
      configUrl,
      videoUrl,
    };
  }
}
