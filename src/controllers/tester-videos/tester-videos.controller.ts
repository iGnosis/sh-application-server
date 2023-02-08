import { Controller, Get, Logger, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { StsService } from 'src/services/clients/sts/sts.service';

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
  ) {
    this.logger = new Logger(TesterVideosController.name);
    this.ENV_NAME = this.configService.get('ENV_NAME');
  }

  @Get('upload-video-creds')
  async uploadVideoUrl(@User('id') userId: string) {
    const fileName = `${new Date().toISOString()}.mp4`;
    const filePath = `${this.ENV_NAME}/${userId}/${fileName}`;
    const credentials = await this.stsService.putObjStsAssumeRole(
      this.BUCKET,
      this.ENV_NAME,
      userId,
      fileName,
    );

    return { credentials, file: filePath, bucket: this.BUCKET };
  }
}
