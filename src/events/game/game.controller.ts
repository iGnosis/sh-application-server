import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { StatsService } from 'src/patient/stats/stats.service';
import { S3Service } from 'src/services/s3/s3.service';
import { EventsService } from '../events.service';
import { GameEnded, GameStarted } from './game.dto';

// console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

@Controller('events/game')
export class GameController {
  private envName: string;
  constructor(
    private eventsService: EventsService,
    private statsService: StatsService,
    private s3Service: S3Service,
    private configService: ConfigService,
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
    const { gameId, patientId, endedAt } = body;
    if (!endedAt) return;

    const downloadsDir = join(process.cwd(), 'pose-documents');
    const fileName = `${patientId}.${gameId}.json`;
    const filePath = join(downloadsDir, fileName);

    try {
      // IFF the file exists.
      await fs.access(filePath);

      // upload the file to S3
      const readableStream = createReadStream(filePath, { encoding: 'utf-8' });
      const command = new PutObjectCommand({
        Body: readableStream,
        Bucket: 'soundhealth-pose-data',
        Key: `${this.envName}/${patientId}/${gameId}.json`,
        StorageClass: 'STANDARD_IA', // infrequent access
      });
      await this.s3Service.client.send(command);
      console.log('file successfully uploaded to s3');

      // run calculations on pose data files & save it to Hasura. - Mohan

      // clean up the file after upload
      await fs.unlink(filePath);
    } catch (err) {
      console.log(err);
    }
  }

  // Call whenever a user lands on Patient Portal.
  @Roles(Role.PATIENT)
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
  @Roles(Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @Post('complete')
  async gameComplete(
    @Body('startDate') startDate: Date,
    @Body('currentDate') currentDate: Date,
    @Body('endDate') endDate: Date,
    @Body('userTimezone') userTimezone: string,
    @User() userId: string,
  ) {
    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);

    console.log('startDate:', startDate);
    console.log('endedAtDate:', endDate);

    const { daysCompleted, groupByCreatedAtDayGames } = await this.statsService.getMonthlyGoalsNew(
      userId,
      startDate,
      addOneDayToendDate,
      userTimezone,
    );

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
