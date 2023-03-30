import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { join } from 'path';
import { User } from 'src/common/decorators/user.decorator';
import { StatsService } from 'src/services/patient-stats/stats.service';
import { AggregateAnalyticsService } from 'src/services/aggregate-analytics/aggregate-analytics.service';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { EventsService } from 'src/services/events/events.service';
import { GameCompletedPinpoint, GameEnded, GameStarted } from './game.dto';
import * as events from 'events';
import * as readLine from 'readline';
import { ExtractInformationService } from 'src/services/extract-information/extract-information.service';
import { PoseDataMessageBody } from 'src/types/global';

@Controller('events/game')
export class GameController {
  private envName: string;
  constructor(
    private eventsService: EventsService,
    private statsService: StatsService,
    private s3Service: S3Service,
    private configService: ConfigService,
    private extractInformationService: ExtractInformationService,
    private aggregateAnalyticsService: AggregateAnalyticsService,
    private logger: Logger,
  ) {
    this.envName = configService.get('ENV_NAME');
    this.logger = new Logger(GameController.name);
  }

  // called whenever a 'game' is inserted in the table.
  @Post('start')
  async gameStarted(@Body() body: GameStarted) {
    const { patientId, createdAt } = body;
    await this.eventsService.gameStarted(patientId);
    return {
      status: 'success',
      data: {},
    };
  }

  // called whenever `endedAt` is set.
  @Post('end')
  async gameEnded(@Body() body: GameEnded) {
    const { gameId, patientId, endedAt, analytics, organizationId } = body;
    if (!endedAt) return;

    // calculate total coins for a game
    const totalGameCoins = analytics.reduce((sum, data) => data.result.coin + sum, 0);
    // TODO: need to know how to calculate Movement Coins earned from XP.
    // await this.aggregateAnalyticsService.updatePatientTotalMovementCoins(patientId, totalGameCoins);
    await this.aggregateAnalyticsService.updateGameTotalCoins(gameId, totalGameCoins);

    // aggregating analytics for a game.
    const aggregatedInfo = {
      avgAchievementRatio: this.aggregateAnalyticsService.averageAchievementRatio(analytics),
      avgCompletionTimeInMs: this.aggregateAnalyticsService.averageCompletionTimeInMs(analytics),
    };
    await this.aggregateAnalyticsService.insertAggregatedAnalytics(
      patientId,
      gameId,
      organizationId,
      {
        ...aggregatedInfo,
      },
    );

    const downloadsDir = join(process.cwd(), 'storage/pose-documents');
    const fileName = `${patientId}.${gameId}.json`;
    const filePath = join(downloadsDir, fileName);

    this.logger.log('gameEnded:filePath: ' + filePath);

    try {
      // IFF the file exists.
      await fs.access(filePath);

      // upload the file to S3
      const command = new PutObjectCommand({
        Body: createReadStream(filePath, { encoding: 'utf-8' }),
        Bucket: 'soundhealth-pose-data',
        Key: `${this.envName}/${patientId}/${gameId}.json`,
        StorageClass: 'STANDARD_IA', // infrequent access
      });
      await this.s3Service.client.send(command);
      this.logger.log('file successfully uploaded to s3');

      // runing calculations on pose data files & saving it to Hasura.
      const extractedInfo = {
        angles: {},
      };
      const jointAngles: { [key: string]: number[] } = {};
      const rl = readLine.createInterface({
        input: createReadStream(filePath, { encoding: 'utf-8' }),
      });

      rl.on('line', (line) => {
        const data: PoseDataMessageBody = JSON.parse(line);
        const angles = this.extractInformationService.extractJointAngles(data.p);
        for (const [key, jointAngle] of Object.entries(angles)) {
          if (!jointAngles.hasOwnProperty(key)) {
            jointAngles[key] = [jointAngle];
          } else {
            jointAngles[key].push(jointAngle);
          }
        }
      });

      await events.once(rl, 'close');

      for (const key of Object.keys(jointAngles)) {
        // calculating the median of top 10 angles
        extractedInfo.angles[key] = parseFloat(
          this.extractInformationService.median(jointAngles[key], 10).toFixed(2),
        );
      }
      // clean up the file after upload
      await fs.unlink(filePath);
      await this.aggregateAnalyticsService.insertAggregatedAnalytics(
        patientId,
        gameId,
        organizationId,
        {
          ...extractedInfo.angles,
        },
      );
    } catch (err) {
      this.logger.error('gameEnded: ' + JSON.stringify(err));
    }

    return {
      status: 'success',
    };
  }

  // Call whenever a user lands on Patient Portal.
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @Post('app-accessed')
  async appAccessed(@User('id') userId: string) {
    await this.eventsService.appAccessed(userId);
    return {
      status: 'success',
    };
  }

  // For pinpoint.
  // Called from activity-exp (since it was pain to manage user localtime server-side)
  // on completion of a game.
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @Post('complete')
  async gameComplete(@Body() body: GameCompletedPinpoint, @User('id') userId: string) {
    const { userTimezone } = body;

    let { startDate, endDate } = body;
    startDate = new Date(startDate);
    endDate = new Date(endDate);

    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);

    const results = await this.statsService.getMonthlyGoalsNew(
      userId,
      startDate,
      addOneDayToendDate,
      userTimezone,
    );

    // just a sanity check.
    if (!results) {
      return;
    }

    const { daysCompleted, groupByCreatedAtDayGames } = results;

    const index = Object.keys(groupByCreatedAtDayGames).length - 1;
    const key = Object.keys(groupByCreatedAtDayGames)[index];
    const latestGameData = groupByCreatedAtDayGames[key];

    const numOfActivitesCompletedToday = latestGameData.length;

    let totalDailyDurationInSec = 0;
    latestGameData.forEach((data) => {
      totalDailyDurationInSec += data.durationInSec;
    });
    const totalDailyDurationInMin = parseFloat((totalDailyDurationInSec / 60).toFixed(2));

    await this.eventsService.gameEnded(userId, {
      numOfActiveDays: daysCompleted,
      numOfActivitesCompletedToday,
      totalDailyDurationInMin: totalDailyDurationInMin,
    });

    return {
      status: 'success',
      data: {},
    };
  }
}
