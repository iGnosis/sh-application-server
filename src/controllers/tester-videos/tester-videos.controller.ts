import { Controller, Get, Logger, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { S3Service } from 'src/services/clients/s3/s3.service';

@UseInterceptors(new TransformResponseInterceptor())
@Controller('tester-videos')
export class TesterVideosController {
  private BUCKET = 'testers-screen-rec';
  private ENV_NAME: string;

  constructor(
    private s3Service: S3Service,
    private readonly logger: Logger,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(TesterVideosController.name);
    this.ENV_NAME = this.configService.get('ENV_NAME');
  }

  @Get('upload-video-url')
  async uploadVideoUrl(@User('id') userId: string) {
    const file = `${this.ENV_NAME}/${userId}/${new Date().toISOString()}.mp4`;
    const uploadUrl = await this.s3Service.putObjectSignedUrl(this.BUCKET, file);
    return { uploadUrl };
  }
}
