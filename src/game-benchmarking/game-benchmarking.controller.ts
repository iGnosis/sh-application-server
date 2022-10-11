import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GameBenchmarkingService } from 'src/services/game-benchmarking/game-benchmarking.service';
import { Response } from 'express';
import { S3Service } from 'src/services/s3/s3.service';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import * as fs from 'fs';
import { TranscodeVideoAPI } from './game-benchmarking.dto';
import { VideoTranscoderService } from 'src/services/video-transcoder/video-transcoder.service';
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
  ) {}

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
        console.log(err);
      }

      // file to be deleted after the transfer is complete.
      fs.unlink(excelFilePath, () => {
        console.log(`file ${excelFilePath} was deleted`);
      });
    });
  }

  @Get('upload-video')
  async s3UploadSignedUrl(@Query('benchmarkConfigId') benchmarkConfigId: string) {
    const webcamUploadUrl = await this.s3Service.putObjectSignedUrl(
      'soundhealth-benchmark-videos',
      `${benchmarkConfigId}/webcam`,
    );
    const screenCaptureUploadUrl = await this.s3Service.putObjectSignedUrl(
      'soundhealth-benchmark-videos',
      `${benchmarkConfigId}/screenCapture`,
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
    const command = new CreateJobCommand({
      PipelineId: this.videoTranscoderPipelineId,
      Input: {
        Key: `${benchmarkConfigId}/${type}`,
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
