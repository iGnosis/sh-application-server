import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Dictionary } from 'lodash';
import { groupBy as lodashGroupBy, merge as lodashMerge } from 'lodash';
import { DatabaseService } from 'src/database/database.service';
import { GqlService } from 'src/services/gql/gql.service';
import { GroupBy, PlotChartDTO } from 'src/types/provider-charts';
import { MonthlyGoalsApiResponse } from '../../types/stats';
import * as moment from 'moment';

@Injectable()
export class StatsService {
  numberOfGamesAvailable: number;
  constructor(private databaseService: DatabaseService, private gqlService: GqlService) {
    // TODO: get activity count dynamically!
    this.numberOfGamesAvailable = 3;
  }

  async getAvgCompletionTimeInSecGroupByGames(query: PlotChartDTO): Promise<
    {
      createdAt: string;
      game: string;
      avgCompletionTimePerRepInSec: number;
    }[]
  > {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    return await this.databaseService.executeQuery(
      `
    SELECT
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
        game.game,
        ROUND(SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples"), 2) "avgCompletionTimePerRepInSec"
    FROM aggregate_analytics
    JOIN game
    ON game.id = aggregate_analytics.game
    WHERE
        aggregate_analytics.patient = $1 AND
        aggregate_analytics."key" = 'avgCompletionTime' AND
        aggregate_analytics."createdAt" >= $2 AND
        aggregate_analytics."createdAt" < $3
    GROUP BY
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")),
        game.game
    ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy],
    );
  }

  async getAvgCompletionTimeInSec(query: PlotChartDTO): Promise<
    {
      createdAt: string;
      avgCompletionTimePerRepInSec: number;
    }[]
  > {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    return await this.databaseService.executeQuery(
      `
    SELECT
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
        ROUND(SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples"), 2) "avgCompletionTimePerRepInSec"
    FROM aggregate_analytics
    JOIN game
    ON game.id = aggregate_analytics.game
    WHERE
        aggregate_analytics.patient = $1 AND
        aggregate_analytics."key" = 'avgCompletionTime' AND
        aggregate_analytics."createdAt" >= $2 AND
        aggregate_analytics."createdAt" < $3
    GROUP BY
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))
    ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy],
    );
  }

  async getAvgAchievementPercentageGroupByGames(query: PlotChartDTO) {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    const result: {
      createdAt: string;
      game: string;
      avgAchievementPercentage: number;
    }[] = await this.databaseService.executeQuery(
      `
      SELECT
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
          game.game,
          ROUND((SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples")) * 100, 2) "avgAchievementPercentage"
      FROM aggregate_analytics
      JOIN game
      ON game.id = aggregate_analytics.game
      WHERE
          aggregate_analytics.patient = $1 AND
          aggregate_analytics."key" = 'avgAchievementRatio' AND
          aggregate_analytics."createdAt" >= $2 AND
          aggregate_analytics."createdAt" < $3
      GROUP BY
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")),
          game.game
      ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy],
    );
    result.forEach((val) => {
      val.avgAchievementPercentage = parseFloat(`${val.avgAchievementPercentage}`);
    });
    return result;
  }

  async getAvgAchievementPercentage(query: PlotChartDTO) {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    const result: {
      createdAt: string;
      avgAchievementPercentage: number;
    }[] = await this.databaseService.executeQuery(
      `
      SELECT
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
          ROUND((SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples")) * 100, 2) "avgAchievementPercentage"
      FROM aggregate_analytics
      JOIN game
      ON game.id = aggregate_analytics.game
      WHERE
          aggregate_analytics.patient = $1 AND
          aggregate_analytics."key" = 'avgAchievementRatio' AND
          aggregate_analytics."createdAt" >= $2 AND
          aggregate_analytics."createdAt" < $3
      GROUP BY
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))
      ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy],
    );
    result.forEach((val) => {
      val.avgAchievementPercentage = parseFloat(`${val.avgAchievementPercentage}`);
    });
    return result;
  }

  async getAvgEngagementRatio(query: PlotChartDTO): Promise<
    {
      createdAt: string;
      gamesPlayedCount: number;
    }[]
  > {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    return await this.databaseService.executeQuery(
      `
      SELECT
          DATE_TRUNC($5, timezone($4, game."createdAt")) "createdAt",
          COUNT(game.game) "gamesPlayedCount"
      FROM game
      WHERE
          patient = $1 AND
          game."endedAt" IS NOT NULL AND
          game."createdAt" >= $2 AND
          game."createdAt" < $3
      GROUP BY DATE_TRUNC($5, timezone($4, game."createdAt"))
      ORDER BY DATE_TRUNC($5, timezone($4, game."createdAt")) DESC`,
      [patientId, startDate, endDate, userTimezone, groupBy],
    );
  }

  async getPatientOverview(startDate: Date, endDate: Date) {
    const engagementResults: {
      patient: string;
      gamesPlayedCount: number;
      engagementRatio: number;
    }[] = await this.databaseService.executeQuery(
      `
      SELECT
        game.patient,
        COUNT(game.game) "gamesPlayedCount"
      FROM game
      WHERE
        game."endedAt" IS NOT NULL AND
        game."createdAt" >= $1 AND
        game."createdAt" < $2
      GROUP BY
          game.patient
      ORDER BY
          game.patient`,
      [startDate, endDate],
    );

    const noOfGamesToPlay = this.getDiffInDays(startDate, endDate) * this.numberOfGamesAvailable;
    engagementResults.forEach((val) => {
      val.gamesPlayedCount = parseInt(`${val.gamesPlayedCount}`);
      val.engagementRatio = parseFloat((val.gamesPlayedCount / noOfGamesToPlay).toFixed(2));
      if (val.engagementRatio > 100) {
        val.engagementRatio = 100;
      }
    });

    const patientsArr = engagementResults.map((val) => val.patient);
    const achievementResults: {
      patient: string;
      avgAchievementPercentage: number;
    }[] = await this.databaseService.executeQuery(
      `
      SELECT
          patient,
          ROUND((SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples")) * 100, 2) "avgAchievementPercentage"
      FROM aggregate_analytics
      WHERE
          patient = ANY($1::uuid[]) AND
          aggregate_analytics."key" = 'avgAchievementRatio' AND
          aggregate_analytics."createdAt" >= $2 AND
          aggregate_analytics."createdAt" < $3
      GROUP BY patient
      ORDER BY patient`,
      [patientsArr, startDate, endDate],
    );

    achievementResults.forEach((val) => {
      val.avgAchievementPercentage = parseFloat(`${val.avgAchievementPercentage}`);
    });

    const mergedObj = lodashMerge(engagementResults, achievementResults);
    return mergedObj;
  }

  async getPatientAdherence(
    startDate: Date,
    endDate: Date,
    groupBy: GroupBy,
  ): Promise<
    {
      patient: string;
      createdAt: Date;
      numOfGamesPlayed: number;
    }[]
  > {
    return await this.databaseService.executeQuery(
      `
      SELECT DISTINCT ON (patient)
          patient,
          DATE_TRUNC($3, game."createdAt") "createdAt",
          COUNT(game.game) "numOfGamesPlayed"
      FROM game
      WHERE
          game."endedAt" IS NOT NULL AND
          game."createdAt" >= $1 AND
          game."endedAt" < $2
      GROUP BY
          patient,
          DATE_TRUNC($3, game."createdAt")
      ORDER BY
          patient,
          DATE_TRUNC($3, game."createdAt") DESC`,
      [startDate, endDate, groupBy],
    );
  }

  async getTotalPatientCount(): Promise<number> {
    const results = await this.databaseService.executeQuery(
      `SELECT count(*) "totalPatientCount" FROM patient`,
    );
    return parseInt(results[0].totalPatientCount);
  }

  async getMonthlyGoalsNew(
    patientId: string,
    startDate: Date,
    endDate: Date,
    dbTimezone: string,
  ): Promise<{
    daysCompleted: number;
    groupByCreatedAtDayGames: Dictionary<
      {
        game: string;
        createdAtDay: Date;
        durationInSec: number;
      }[]
    >;
  }> {
    const results: Array<{
      createdAtDay: Date;
      game: string;
      durationInSec: number;
    }> = await this.databaseService.executeQuery(
      `SELECT DISTINCT
        game,
        DATE_TRUNC('day', timezone($4, "createdAt")) "createdAtDay",
        (extract('epoch' from game."endedAt") - extract('epoch' from game."createdAt")) "durationInSec"
      FROM game
      WHERE
        patient = $1 AND
        game."createdAt" >= $2 AND
        game."createdAt" < $3 AND
        DATE_TRUNC('day', timezone($4, "endedAt")) IS NOT NULL
      ORDER BY DATE_TRUNC('day', timezone($4, "createdAt"))`,
      [patientId, startDate, endDate, dbTimezone],
    );

    console.log('results:', results);

    // just a sanity check.
    if (!results || !Array.isArray(results) || results.length === 0) {
      return;
    }

    // grouping by createdAt date.
    const groupByRes = lodashGroupBy(results, 'createdAtDay');
    // console.log('groupByRes:', groupByRes);

    const getGamesQuery = `query GetAllGames {
      game_name {
        name
      }
    }`;
    const response = await this.gqlService.client.request(getGamesQuery);
    const gamesAvailable: string[] = response.game_name.map((data) => data.name);

    let daysCompleted = 0;
    for (const [createdAtDay, gamesArr] of Object.entries(groupByRes)) {
      const seenGames = new Set();
      gamesArr.forEach((game) => {
        const isSeen = seenGames.has(game.game);
        if (!isSeen) {
          seenGames.add(game.game);
        }
      });

      // increment counter only if all the avaiable games were played.
      if (seenGames.size === gamesAvailable.length) {
        daysCompleted++;
      }
    }
    return { daysCompleted, groupByCreatedAtDayGames: groupByRes };
  }

  // TODO: clean this up
  // async updateActiveDays(patientId: string, activeDays: number) {
  //   const updateActiveDaysQuery = `mutation UpdatePatientActiveDays($patientId: uuid!, $activeDays: Int!) {
  //     update_patient(where: {id: {_eq: $patientId}}, _set: {activeDays: $activeDays}) {
  //       affected_rows
  //     }
  //   }`;
  //   await this.gqlService.client.request(updateActiveDaysQuery, { patientId, activeDays });
  // }

  workOutStreak(days: Array<MonthlyGoalsApiResponse>) {
    let streak = 0;
    let mostRecentDate = new Date(new Date().setHours(0, 0, 0, 0));
    const activeDays = days.filter((day) => day.activityEndedCount >= 3);

    for (let i = 0; i < activeDays.length; i++) {
      const dayCreatedAt = new Date(activeDays[i].createdAtLocaleDate);
      const diff = mostRecentDate.getTime() - dayCreatedAt.getTime();
      if (diff === 0 || diff == 86400000) {
        streak++;
      } else {
        break;
      }
      mostRecentDate = dayCreatedAt;
    }
    return streak;
  }

  getFutureDate(currentDate: Date, numOfDaysInFuture: number) {
    return new Date(currentDate.getTime() + 86400000 * numOfDaysInFuture);
  }

  getPastDate(currentDate: Date, numOfDaysInPast: number) {
    return new Date(currentDate.getTime() - 86400000 * numOfDaysInPast);
  }

  getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getUTCDate();
  }

  getDiffInDays(startDate: Date, endDate: Date) {
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);
  }

  generateDates(startDate: Date, endDate: Date, offset: GroupBy) {
    const mStartDate = moment(startDate);
    const mEndDate = moment(endDate);
    const generateDates = [];

    if (mEndDate.isBefore(mStartDate)) {
      throw new HttpException('Something went wrong', HttpStatus.BAD_REQUEST);
    }

    while (mStartDate.isBefore(mEndDate)) {
      generateDates.push(mStartDate.format('YYYY-MM-DD'));
      mStartDate.add(1, offset);
    }
    return generateDates;
  }
}
