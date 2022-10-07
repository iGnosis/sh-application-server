import { Controller, Get, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
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

@Roles(Role.BENCHMARK)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('game-benchmarking')
@UseInterceptors(new TransformResponseInterceptor())
export class GameBenchmarkingController {
  constructor(
    private gameBenchmarkingService: GameBenchmarkingService,
    private s3Service: S3Service,
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
      `${benchmarkConfigId}/screen-capture`,
    );

    const webcamDownloadUrl = `https://soundhealth-benchmark-videos.s3.amazonaws.com/${benchmarkConfigId}/webcam`;
    const screenCaptureDownloadUrl = `https://soundhealth-benchmark-videos.s3.amazonaws.com/${benchmarkConfigId}/screen-capture`;

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
}
