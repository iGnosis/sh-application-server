import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GameBenchmarkingService } from 'src/services/game-benchmarking/game-benchmarking.service';
import { Response } from 'express';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import * as fs from 'fs';
import { TranscodeVideoAPI } from './game-benchmarking.dto';
import { VideoTranscoderService } from 'src/services/clients/video-transcoder/video-transcoder.service';
import { CreateJobCommand } from '@aws-sdk/client-elastic-transcoder';

@Roles(Role.BENCHMARK)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('game-benchmarking')
@UseInterceptors(new TransformResponseInterceptor())
export class GameBenchmarkingController {
  private videoTranscoderPipelineId = '1665469373812-uc99w8';

  constructor(
    private gameBenchmarkingService: GameBenchmarkingService,
    private s3Service: S3Service,
    private videoTranscoderService: VideoTranscoderService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(GameBenchmarkingController.name);
  }

  @Get('report')
  async generateReport(
    @Query('newGameId') newGameId: string,
    @Query('benchmarkConfigId') benchmarkConfigId: string,
    @Res() res: Response,
  ) {
    const reportMetrics = await this.gameBenchmarkingService.generateReport(
      newGameId,
      benchmarkConfigId,
    );
    const excelFilePath = await this.gameBenchmarkingService.createExcelReport(reportMetrics);
    res.download(excelFilePath, `${newGameId}-report.xlsx`, (err) => {
      if (err) {
        this.logger.error('generateReport: ' + JSON.stringify(err));
      }

      // file to be deleted after the transfer is complete.
      fs.unlink(excelFilePath, () => {
        this.logger.log(`file ${excelFilePath} was deleted`);
      });
    });
  }

  @Get('upload-video')
  async s3UploadSignedUrl(@Query('benchmarkConfigId') benchmarkConfigId: string) {
    const webcamUploadUrl = await this.s3Service.putObjectSignedUrl(
      'soundhealth-benchmark-videos',
      `raw/${benchmarkConfigId}/webcam`,
    );
    const screenCaptureUploadUrl = await this.s3Service.putObjectSignedUrl(
      'soundhealth-benchmark-videos',
      `raw/${benchmarkConfigId}/screenCapture`,
    );

    const webcamDownloadUrl = `https://soundhealth-benchmark-videos.s3.amazonaws.com/transcoded/${benchmarkConfigId}/webcam.mp4`;
    const screenCaptureDownloadUrl = `https://soundhealth-benchmark-videos.s3.amazonaws.com/transcoded/${benchmarkConfigId}/screenCapture.mp4`;

    await this.gameBenchmarkingService.updateBenchmarkConfigVideoUrls(
      benchmarkConfigId,
      webcamDownloadUrl,
      screenCaptureDownloadUrl,
    );

    return {
      webcamUploadUrl,
      screenCaptureUploadUrl,
    };
  }

  @Post('transcode-video')
  async transcodeVideo(@Body() body: TranscodeVideoAPI) {
    const { benchmarkConfigId, type } = body;

    // if Key already exists, then delete it from S3 first.
    await this.s3Service.deleteObject(
      'soundhealth-benchmark-videos',
      `transcoded/${benchmarkConfigId}/${type}.mp4`,
    );

    const command = new CreateJobCommand({
      PipelineId: this.videoTranscoderPipelineId,
      Input: {
        Key: `raw/${benchmarkConfigId}/${type}`,
      },
      OutputKeyPrefix: 'transcoded/',
      Output: {
        Key: `${benchmarkConfigId}/${type}.mp4`,
        PresetId: '1351620000001-000020', // https://docs.aws.amazon.com/elastictranscoder/latest/developerguide/system-presets.html
      },
    });
    await this.videoTranscoderService.client.send(command);

    return {
      status: 'success',
    };
  }
}
