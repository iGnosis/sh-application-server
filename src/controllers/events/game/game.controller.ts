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
import { GameCompletedPinpoint, GameEnded, GameStarted, SetGameEndedatEvent } from './game.dto';
import * as events from 'events';
import * as readLine from 'readline';
import { ExtractInformationService } from 'src/services/extract-information/extract-information.service';
import { NovuSubscriberData, PoseDataMessageBody } from 'src/types/global';
import { NovuService } from 'src/services/novu/novu.service';
import { CronService } from 'src/services/cron/cron.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { GameService } from 'src/services/game/game.service';

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
    private novuService: NovuService,
    private cronService: CronService,
    private gameService: GameService,
  ) {
    this.envName = configService.get('ENV_NAME');
    this.logger = new Logger(GameController.name);
  }

  @Post('set-game-endedat')
  async setGameEndedAt(@Body() body: SetGameEndedatEvent) {
    const game = await this.gameService.getGameByPk(body.payload.gameId);
    if (game.endedAt) return;

    let endedAt;
    if (!game.analytics.length) {
      endedAt = body.payload.createdAt;
    } else {
      // get last prompt timestamp
      endedAt = new Date(game.analytics[game.analytics.length - 1].prompt.timestamp).toISOString();
    }

    await this.gameService.setGameEndedAt(body.payload.gameId, endedAt);
    return {
      status: 'success',
    };
  }

  // called whenever a 'game' is inserted in the table.
  @Post('start')
  async gameStarted(@Body() body: GameStarted) {
    // schedule a cronjob to run after 45 minutes.
    const now = new Date();
    const scheduledAt = new Date(now.setMinutes(now.getMinutes() + 45));
    await this.cronService.scheduleOneOffCron(
      scheduledAt.toISOString(),
      '/events/game/set-game-endedat',
      { ...body },
      'sets endedAt of a game.',
    );
    // await this.eventsService.gameStarted(patientId);
    return {
      status: 'success',
    };
  }

  // called whenever `endedAt` is set.
  @Post('end')
  async gameEnded(@Body() body: GameEnded) {
    const { gameId, patientId, endedAt, analytics, organizationId } = body;
    if (!endedAt) return;

    // Trigger Novu events.
    // first activity played greeting.
    const subscriber = await this.novuService.getSubscriber(patientId);

    if (subscriber && subscriber.data && !subscriber.data.firstActivityPlayed) {
      await this.novuService.firstActivityCompleted(patientId);

      const novuData: Partial<NovuSubscriberData> = {
        ...subscriber.data,
        firstActivityPlayed: true,
      };
      await this.novuService.novuClient.subscribers.update(patientId, {
        data: { ...novuData },
      });
    }

    // "Almost broken streak" notification to be sent after 24 hours.
    const remindAt = new Date(endedAt);
    remindAt.setHours(remindAt.getHours() + 24);
    // we cancel previous "Almost broken streak" trigger if it exist.
    const almostBrokenStreakTriggerId = `${patientId}-almost-broken-streak`;
    await this.novuService.cancelTrigger(almostBrokenStreakTriggerId);
    await this.novuService.almostBrokenStreakReminder(
      patientId,
      remindAt.toISOString(),
      almostBrokenStreakTriggerId,
    );

    const streak = await this.statsService.calculateStreak(patientId);

    // incase if user is playing same activity over & over.
    const { pastSameActivityCount, sameActivityName } =
      await this.statsService.getPastSameActivityCount(patientId);
    const novuData: Partial<NovuSubscriberData> = {
      ...subscriber.data,
      lastActivityPlayedOn: new Date().toISOString(),
      sendInactiveUserReminder: true,
      activityStreakCount: streak,
      pastSameActivityCount,
    };
    await this.novuService.novuClient.subscribers.update(patientId, {
      data: { ...novuData },
    });
    await this.novuService.userPlayingSameGame(patientId, sameActivityName);
    await this.novuService.maintainingStreak(patientId);

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

  @Post('highscore-reached')
  async highscoreReached(@User('id') userId: string, @Body('gameName') gameName: string) {
    await this.novuService.highScoreReached(userId, gameName);
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

  // For Novu.
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

    if (daysCompleted >= 10) {
      const subscriber = await this.novuService.getSubscriber(userId);
      if (subscriber && subscriber.data && !subscriber.data.feedbackOn10ActiveDaysSent) {
        await this.novuService.feedbackOn10ActiveDays(userId);
        const novuData: Partial<NovuSubscriberData> = {
          ...subscriber.data,
          feedbackOn10ActiveDaysSent: true,
        };
        await this.novuService.novuClient.subscribers.update(userId, {
          data: { ...novuData },
        });
      }
    }

    // const index = Object.keys(groupByCreatedAtDayGames).length - 1;
    // const key = Object.keys(groupByCreatedAtDayGames)[index];
    // const latestGameData = groupByCreatedAtDayGames[key];

    // const numOfActivitesCompletedToday = latestGameData.length;

    // let totalDailyDurationInSec = 0;
    // latestGameData.forEach((data) => {
    //   totalDailyDurationInSec += data.durationInSec;
    // });
    // const totalDailyDurationInMin = parseFloat((totalDailyDurationInSec / 60).toFixed(2));

    // await this.eventsService.gameEnded(userId, {
    //   numOfActiveDays: daysCompleted,
    //   numOfActivitesCompletedToday,
    //   totalDailyDurationInMin: totalDailyDurationInMin,
    // });

    return {
      status: 'success',
      data: {},
    };
  }
}
