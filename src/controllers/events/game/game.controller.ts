import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { StatsService } from 'src/services/patient-stats/stats.service';
import { AggregateAnalyticsService } from 'src/services/aggregate-analytics/aggregate-analytics.service';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { EventsService } from 'src/services/events/events.service';
import { GameCompletedPinpoint, GameEnded, GameStarted } from './game.dto';
import * as events from 'events';
import * as readLine from 'readline';
import { ExtractInformationService } from 'src/services/extract-information/extract-information.service';
import { PoseDataMessageBody } from 'src/types/global';

// console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

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
  ) {
    this.envName = configService.get('ENV_NAME');
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
    const { gameId, patientId, endedAt, analytics } = body;
    if (!endedAt) return;

    // aggregating analytics for a game.
    const aggregatedInfo = {
      avgAchievementRatio: this.aggregateAnalyticsService.averageAchievementRatio(analytics),
      avgCompletionTimeInMs: this.aggregateAnalyticsService.averageCompletionTimeInMs(analytics),
    };
    await this.aggregateAnalyticsService.insertAggregatedAnalytics(patientId, gameId, {
      ...aggregatedInfo,
    });

    const downloadsDir = join(process.cwd(), 'pose-documents');
    const fileName = `${patientId}.${gameId}.json`;
    const filePath = join(downloadsDir, fileName);

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
      console.log('file successfully uploaded to s3');

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
      await this.aggregateAnalyticsService.insertAggregatedAnalytics(patientId, gameId, {
        ...extractedInfo.angles,
      });
    } catch (err) {
      console.log(err);
    }

    return {
      status: 'success',
    };
  }

  // Call whenever a user lands on Patient Portal.
  @Roles(Role.PATIENT, Role.BENCHMARK)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Post('app-accessed')
  async appAccessed(@User() userId: string) {
    await this.eventsService.appAccessed(userId);
    return {
      status: 'success',
    };
  }

  // For pinpoint.
  // Called from activity-exp (since it was pain to manage user localtime server-side)
  // on completion of a game.
  @Roles(Role.PATIENT, Role.BENCHMARK)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Post('complete')
  async gameComplete(@Body() body: GameCompletedPinpoint, @User() userId: string) {
    const { userTimezone } = body;

    let { startDate, endDate } = body;
    startDate = new Date(startDate);
    endDate = new Date(endDate);

    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);

    console.log('startDate:', startDate);
    console.log('endedAtDate:', endDate);

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
    // console.log('groupByCreatedAtDayGames:', groupByCreatedAtDayGames);

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

    console.log('numOfActiveDays:', daysCompleted);
    console.log('numOfActivitesCompletedToday:', numOfActivitesCompletedToday);
    console.log('totalDailyDurationInMin:', totalDailyDurationInMin);

    return {
      status: 'success',
      data: {},
    };
  }
}
