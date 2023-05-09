import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Dictionary } from 'lodash';
import { groupBy as lodashGroupBy, merge as lodashMerge } from 'lodash';
import { DatabaseService } from 'src/database/database.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { GroupBy, PlotChartDTO, PlotHeatmapDTO } from 'src/types/provider-charts';
import * as moment from 'moment';

@Injectable()
export class StatsService {
  numberOfGamesAvailable: number;
  constructor(
    private databaseService: DatabaseService,
    private gqlService: GqlService,
    private logger: Logger,
  ) {
    // TODO: get activity count dynamically!
    this.numberOfGamesAvailable = 4;
  }

  async getAvgCompletionTimeInMsGroupByGames(
    query: PlotChartDTO,
    orgId: string,
  ): Promise<
    {
      createdAt: string;
      game: string;
      avgCompletionTimePerRepInMs: number;
    }[]
  > {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    return await this.databaseService.executeQuery(
      `
    SELECT
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
        game.game,
        ROUND(SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples"), 2) "avgCompletionTimePerRepInMs"
    FROM game
    JOIN aggregate_analytics
    ON game.id = aggregate_analytics.game
    WHERE
        game.patient = $1 AND
        game."organizationId" = $6 AND
        aggregate_analytics."key" = 'avgCompletionTimeInMs' AND
        aggregate_analytics."createdAt" >= $2 AND
        aggregate_analytics."createdAt" < $3
    GROUP BY
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")),
        game.game
    ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy, orgId],
    );
  }

  async getAvgCompletionTimeInMs(
    query: PlotChartDTO,
    orgId: string,
  ): Promise<
    {
      createdAt: string;
      avgCompletionTimePerRepInMs: number;
    }[]
  > {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    return await this.databaseService.executeQuery(
      `
    SELECT
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
        ROUND(SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples"), 2) "avgCompletionTimePerRepInMs"
    FROM game
    JOIN aggregate_analytics
    ON game.id = aggregate_analytics.game
    WHERE
        game.patient = $1 AND
        game."organizationId" = $6 AND
        aggregate_analytics."key" = 'avgCompletionTimeInMs' AND
        aggregate_analytics."createdAt" >= $2 AND
        aggregate_analytics."createdAt" < $3
    GROUP BY
        DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))
    ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy, orgId],
    );
  }

  async getAvgAchievementPercentageGroupByGames(query: PlotChartDTO, orgId: string) {
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
      FROM game
      JOIN aggregate_analytics
      ON game.id = aggregate_analytics.game
      WHERE
          game.patient = $1 AND
          game."organizationId" = $6 AND
          aggregate_analytics."key" = 'avgAchievementRatio' AND
          aggregate_analytics."createdAt" >= $2 AND
          aggregate_analytics."createdAt" < $3
      GROUP BY
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")),
          game.game
      ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy, orgId],
    );
    result.forEach((val) => {
      val.avgAchievementPercentage = parseFloat(`${val.avgAchievementPercentage}`);
    });
    return result;
  }

  async getPatientsMonthlyCompletion(query: PlotHeatmapDTO, orgId: string) {
    const { startDate, endDate, userTimezone, sortBy, sortDirection, showInactive, limit, offset } =
      query;
    let result: any[];
    if (sortBy === 'recentActivity') {
      result = await this.databaseService.executeQuery(
        `
          SELECT p.id, g."gamesCompleted", g.nickname, g."createdAt"
            FROM (SELECT id from patient LIMIT $4 OFFSET $5 WHERE patient."organizationId" = $7) as p
            LEFT OUTER JOIN
              (SELECT
                DATE_TRUNC('day', timezone($3, game."createdAt")) "createdAt",
                COUNT(*) FILTER(WHERE game."endedAt" IS NOT NULL) "gamesCompleted",
                patient.nickname, patient.id
              FROM game
              RIGHT JOIN patient
              ON game.patient = patient.id
              WHERE
                game."createdAt" BETWEEN $1 AND $2 AND
                game."organizationId" = $7
              GROUP BY
                DATE_TRUNC('day', timezone($3, game."createdAt")),
                patient.id
              ORDER BY DATE_TRUNC('day', timezone($3, game."createdAt")) $6) as g
            ON g.id = p.id
          `,
        [startDate, endDate, userTimezone, limit, offset, sortDirection, orgId],
      );
    } else {
      result = await this.databaseService.executeQuery(
        `
        SELECT p.id, g."gamesCompleted", g.nickname, g."createdAt"
          FROM (SELECT id from patient LIMIT $4 OFFSET $5 WHERE patient."organizationId" = $6) as p
          LEFT OUTER JOIN
            (SELECT
                DATE_TRUNC('day', timezone($3, game."createdAt")) "createdAt",
                COUNT(*) FILTER(WHERE game."endedAt" IS NOT NULL) "gamesCompleted",
                patient.nickname, patient.id
            FROM game
            RIGHT JOIN patient
            ON game.patient = patient.id
            WHERE
              game."createdAt" BETWEEN $1 AND $2 AND
              game."organizationId" = $6
            GROUP BY
                DATE_TRUNC('day', timezone($3, game."createdAt")),
                patient.id
            ORDER BY patient.id) as g
          ON g.id = p.id`,
        [startDate, endDate, userTimezone, limit, offset, orgId],
      );
    }
    const noOfPages = await this.databaseService.executeQuery(
      `
      SELECT CEILING(CEILING(COUNT(*))/$1)
      FROM patient
      WHERE patient."organizationId" = $2
      `,
      [limit, orgId],
    );
    let groupedResult = [];
    if (result) {
      groupedResult = result.reduce((acc, val) => {
        if (acc.findIndex((v) => val.id === Object.keys(v)[0]) === -1) {
          acc.push({
            [val.id]: [],
          });
        }
        return acc;
      }, []);

      result.forEach((val) => {
        const idx = groupedResult.findIndex((v) => Object.keys(v)[0] === val.id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...data } = val;
        groupedResult[idx][val.id].push(data);
      });
      if (sortBy === 'overallActivity') {
        groupedResult = this.sortByOverallActivity(groupedResult, sortDirection);
      }
      if (!showInactive) {
        groupedResult = this.hideInactivePatients(groupedResult);
      }
    }
    return { result: groupedResult, pages: noOfPages[0].ceiling };
  }

  private sortByOverallActivity(groupedResult: any[], sortDirection = 'desc') {
    const sumArrayOfObjectProperty = (arr: any, key: string) =>
      arr.reduce((a: any, b: any) => a + (Number(b[key]) || 0), 0);
    const sortByMonthlyCompletion = (a: any, b: any) => {
      const aName = Object.keys(a)[0];
      const bName = Object.keys(b)[0];
      const aSum = sumArrayOfObjectProperty(a[aName], 'gamesCompleted');
      const bSum = sumArrayOfObjectProperty(b[bName], 'gamesCompleted');
      return sortDirection === 'desc' ? bSum - aSum : aSum - bSum;
    };

    return groupedResult.sort(sortByMonthlyCompletion);
  }

  private hideInactivePatients(groupedResult: any[]) {
    const sumArrayOfObjectProperty = (arr: any, key: string) =>
      arr.reduce((a: any, b: any) => a + (Number(b[key]) || 0), 0);
    const filterInactive = (obj: any) => {
      const name = Object.keys(obj)[0];
      const sum = sumArrayOfObjectProperty(obj[name], 'gamesCompleted');
      return sum > 0;
    };
    return groupedResult.filter(filterInactive);
  }

  async getAvgAchievementPercentage(query: PlotChartDTO, orgId: string) {
    const { patientId, startDate, endDate, userTimezone, groupBy } = query;
    const result: {
      createdAt: string;
      avgAchievementPercentage: number;
    }[] = await this.databaseService.executeQuery(
      `
      SELECT
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt")) "createdAt",
          ROUND((SUM(aggregate_analytics.value * aggregate_analytics."noOfSamples") / SUM(aggregate_analytics."noOfSamples")) * 100, 2) "avgAchievementPercentage"
      FROM game
      JOIN aggregate_analytics
      ON game.id = aggregate_analytics.game
      WHERE
          game.patient = $1 AND
          game."organizationId" = $6 AND
          aggregate_analytics."key" = 'avgAchievementRatio' AND
          aggregate_analytics."createdAt" >= $2 AND
          aggregate_analytics."createdAt" < $3
      GROUP BY
          DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))
      ORDER BY DATE_TRUNC($5, timezone($4, aggregate_analytics."createdAt"))`,
      [patientId, startDate, endDate, userTimezone, groupBy, orgId],
    );
    result.forEach((val) => {
      val.avgAchievementPercentage = parseFloat(`${val.avgAchievementPercentage}`);
    });
    return result;
  }

  async getAvgEngagementRatio(
    query: PlotChartDTO,
    orgId: string,
  ): Promise<
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
          game.patient = $1 AND
          game."endedAt" IS NOT NULL AND
          game."createdAt" >= $2 AND
          game."createdAt" < $3 AND
          game."organizationId" = $6
      GROUP BY DATE_TRUNC($5, timezone($4, game."createdAt"))
      ORDER BY DATE_TRUNC($5, timezone($4, game."createdAt")) DESC`,
      [patientId, startDate, endDate, userTimezone, groupBy, orgId],
    );
  }

  async getPatientOverview(startDate: Date, endDate: Date, orgId: string) {
    const engagementResults: {
      patient: string;
      nickname: string;
      gamesPlayedCount: number;
      engagementRatio: number;
    }[] = await this.databaseService.executeQuery(
      `
      SELECT
        g.patient,
        p.nickname,
        COUNT(g.game) "gamesPlayedCount"
      FROM game g
      JOIN patient p
      ON g.patient = p.id
      WHERE
        g."endedAt" IS NOT NULL AND
        g."createdAt" >= $1 AND
        g."createdAt" < $2 AND
        g."organizationId" = $3
      GROUP BY
          g.patient, p.nickname
      ORDER BY
          g.patient`,
      [startDate, endDate, orgId],
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
    orgId: string,
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
          game.patient,
          DATE_TRUNC($3, game."createdAt") "createdAt",
          COUNT(game.game) "numOfGamesPlayed"
      FROM game
      WHERE
          game."endedAt" IS NOT NULL AND
          game."createdAt" >= $1 AND
          game."endedAt" < $2 AND
          game."organizationId" = $4
      GROUP BY
          game.patient,
          DATE_TRUNC($3, game."createdAt")
      ORDER BY
          game.patient,
          DATE_TRUNC($3, game."createdAt") DESC`,
      [startDate, endDate, groupBy, orgId],
    );
  }

  async getTotalPatientCount(orgId: string): Promise<number> {
    const results = await this.databaseService.executeQuery(
      `SELECT count(*) "totalPatientCount"
       FROM patient
       WHERE patient."organizationId" = $1`,
      [orgId],
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

    // console.log('results:', results);

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

      // increment counter only if at least one game was played.
      if (seenGames.size >= 1) {
        daysCompleted++;
      }
    }
    return { daysCompleted, groupByCreatedAtDayGames: groupByRes };
  }

  async getPastSameActivityCount(patientId: string) {
    const query = `query GetGames($patientId: uuid!) {
      game(where: {patient: {_eq: $patientId}}, order_by: {createdAt: desc}, limit: 10) {
        id
        game
        createdAt
      }
    }`;
    const resp = await this.gqlService.client.request(query, { patientId });

    let pastSameActivityCount = 0;
    for (let i = 0; i < resp.game.length - 1; i++) {
      if (resp.game[i].game === resp.game[i + 1].game) {
        pastSameActivityCount = pastSameActivityCount + 1;
      }
    }
    return {
      pastSameActivityCount,
      sameActivityName: resp.game[0].game,
    };
  }

  async calculateStreak(patientId: string) {
    const query = `query GetGames($patientId: uuid!) {
      game(where: {patient: {_eq: $patientId}}, order_by: {createdAt: desc}, limit: 50) {
        id
        game
        createdAt
      }
    }`;
    const resp = await this.gqlService.client.request(query, { patientId });

    let streak = 0;
    let prevDate: Date = null;

    for (let i = 0; i < resp.game.length; i++) {
      const currentDate = new Date(resp.game[i].createdAt);
      if (prevDate !== null) {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak = streak + 1;
        } else if (diffDays > 1) {
          break;
        }
      } else {
        streak = 1;
      }
      prevDate = currentDate;
    }
    return streak;
  }

  async totalActivityDuration(patientId: string) {
    const sql = `
    SELECT SUM(EXTRACT(epoch FROM ("endedAt" - "createdAt"))) AS "totalDurationSec"
    FROM game
    WHERE
      patient = $1 AND
      "endedAt" IS NOT NULL;
    `;
    try {
      const results = await this.databaseService.executeQuery(sql, [patientId]);
      return parseFloat(parseFloat(results[0].totalDurationSec).toFixed(2));
    } catch (err) {
      this.logger.error('totalActivityDuration:err:', JSON.stringify(err));
    }
  }

  async totalWeeklyActivityTimeDuration(patientId: string) {
    const sql = `
    SELECT
    DATE_TRUNC('week', "createdAt") AS "weekStart",
    SUM(EXTRACT(epoch FROM ("endedAt" - "createdAt"))) AS "totalDurationSec"
    FROM game
    WHERE
      patient = $1 AND
      "endedAt" IS NOT NULL AND
      "createdAt" >= DATE_TRUNC('week', NOW())
    GROUP BY "weekStart"
    ORDER BY "weekStart" DESC;
    `;
    const results = await this.databaseService.executeQuery(sql, [patientId]);
    return parseFloat(parseFloat(results[0].totalDurationSec).toFixed(2));
  }

  async totalMonthlyActivityTimeDuration(patientId: string) {
    const sql = `
    SELECT
      DATE_TRUNC('month', "createdAt") AS "monthStart",
      SUM(EXTRACT(epoch FROM ("endedAt" - "createdAt"))) AS "totalDurationSec"
    FROM game
    WHERE
      patient = $1 AND
      "endedAt" IS NOT NULL AND
      "createdAt" >= DATE_TRUNC('month', NOW())
    GROUP BY "monthStart"
    ORDER BY "monthStart" DESC;
    `;
    const results = await this.databaseService.executeQuery(sql, [patientId]);
    return parseFloat(parseFloat(results[0].totalDurationSec).toFixed(2));
  }

  async totalActivityCount(patient: string) {
    const query = `query TotalGameCount($patient: uuid!) {
      game_aggregate(where: {patient: {_eq: $patient}}) {
        aggregate {
          count
        }
      }
    }`;
    const resp = await this.gqlService.client.request(query, { patient });
    return resp.game_aggregate.aggregate.count;
  }

  getFutureDate(currentDate: Date, numOfDaysInFuture: number) {
    return new Date(currentDate.getTime() + 86400000 * numOfDaysInFuture);
  }

  getPastDate(currentDate: Date, numOfDaysInPast: number) {
    return new Date(currentDate.getTime() - 86400000 * numOfDaysInPast);
  }

  /**
   * month is indexed from 1.
   * ie. 1 = January, 12 = December
   *
   * @param year
   * @param month
   * @returns number of days in a given month & a year.
   */
  getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
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
