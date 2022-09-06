import { HttpCode, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { groupBy as lodashGroupBy } from 'lodash';
import { StatsService } from 'src/patient/stats/stats.service';
import { GroupBy, PlotChartDTO } from 'src/types/provider-charts';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class ProviderChartsService {
  numberOfGamesAvailable: number;
  constructor(private statService: StatsService, private gqlService: GqlService) {
    // TODO: get activity count dynamically!
    this.numberOfGamesAvailable = 3;
  }

  getOverviewChart(startDate: Date, endDate: Date, cache = true) {
    throw new Error('Not Yet Implemented.');

    // Easy.
    // fetch all the patients
    // fetch patients' games within the date ranges
    // --> Store the number of games played
    // --> figure out their average session completion
    // --> figure out their average achievement ratio

    const apiResponse = {
      // x --> avg session completion
      // y --> avg achievement ratio
      // pid --> nickname
      data: [
        { x: 20, y: 30, r: 10, pid: 'anakin' },
        { x: 40, y: 10, r: 25, pid: 'obiwan' },
        { x: 55, y: 47, r: 18, pid: 'leia' },
      ],
    };
    return apiResponse;
  }

  async getPatientAvgCompletionTime(query: PlotChartDTO) {
    if (query.isGroupByGames) {
      return await this.statService.getAvgCompletionTimeInSecGroupByGames(query);
    } else {
      return await this.statService.getAvgCompletionTimeInSec(query);
    }
  }

  async getPatientAvgAchievement(query: PlotChartDTO) {
    if (query.isGroupByGames) {
      const results = await this.statService.getAvgAchievementPercentageGroupByGames(query);
      // console.log('results:', results);

      const generatedDates = this.statService.generateDates(
        query.startDate,
        query.endDate,
        query.groupBy,
      );
      console.log('generatedDates:', generatedDates);

      const plottableFormatDs = [];
      const groupedByGames = lodashGroupBy(results, 'game');
      console.log('groupedByGames:', groupedByGames);

      for (const [gameName, gameArr] of Object.entries(groupedByGames)) {
        const obj = {
          game: gameName,
          avgAchievmentPercentage: [],
        };

        const existingDates = gameArr.map((val) => new Date(val.createdAt).toISOString());

        generatedDates.forEach((gDate: string) => {
          if (!existingDates.includes(gDate)) {
            obj.avgAchievmentPercentage.push(0);
          } else {
            gameArr.forEach((game) => {
              if (new Date(gDate).getTime() - new Date(game.createdAt).getTime() === 0) {
                obj.avgAchievmentPercentage.push(game.avgAchievementPercentage);
              }
            });
          }
        });
        plottableFormatDs.push(obj);
      }
      console.log('plottableFormatDs:', plottableFormatDs);
      return plottableFormatDs;
    } else {
      return await this.statService.getAvgAchievementPercentage(query);
    }
  }

  async getPatientAvgEngagement(query: PlotChartDTO) {
    const results = await this.statService.getAvgEngagementRatio(query);
    let numOfGamesToBePlayed: number;

    if (query.groupBy === 'day') {
      numOfGamesToBePlayed = this.numberOfGamesAvailable;
    }

    if (query.groupBy === 'week') {
      numOfGamesToBePlayed = 7 * this.numberOfGamesAvailable;
    }
    const engagementResultSet = {};
    results.forEach((result) => {
      if (query.groupBy === 'month') {
        const currentYear = new Date(result.createdAt).getUTCFullYear();
        const currentMonth = new Date(result.createdAt).getUTCMonth();
        const noOfDays = this.statService.getDaysInMonth(currentYear, currentMonth);
        numOfGamesToBePlayed = noOfDays * this.numberOfGamesAvailable;
      }

      const key = new Date(result.createdAt).toISOString();
      engagementResultSet[key] = parseFloat(
        ((result.gamesPlayedCount / numOfGamesToBePlayed) * 100).toFixed(2),
      );
      if (engagementResultSet[key] > 100) {
        engagementResultSet[key] = 100;
      }
    });

    return engagementResultSet;
  }

  async getAdheranceChart(startDate: Date, endDate: Date, groupBy: GroupBy) {
    if (groupBy === 'day') {
      throw new HttpException('Not Implemented', HttpStatus.NOT_IMPLEMENTED);
    }

    let numOfGamesToBePlayed: number;
    if (groupBy === 'week') {
      numOfGamesToBePlayed = 7 * this.numberOfGamesAvailable;
    }

    if (groupBy === 'month') {
      const currentYear = new Date().getUTCFullYear();
      const currentMonth = new Date().getUTCMonth();
      numOfGamesToBePlayed =
        this.statService.getDaysInMonth(currentYear, currentMonth) * this.numberOfGamesAvailable;
    }

    const results = await this.statService.getPatientAdherence(startDate, endDate, groupBy);
    const filteredPatients = results.filter((val) => val.numOfGamesPlayed >= numOfGamesToBePlayed);
    return filteredPatients;

    /*
        const apiResponse = {
          labels: ['Active Patients', 'Inactive Patients'],
          pieChartDataset: [11, 4],
          backgroundColor: ['#ffa2ad', '#2f51ae'],
        };
        return apiResponse;
    */
  }

  // TOOD: remove this function
  async getPatientEngagementTemp(
    patientId: string,
    startDate: Date,
    endDate: Date,
    timezone: string,
  ) {
    const engagmentStore = {};
    const results = await this.statService.getMonthlyGoalsNew(
      patientId,
      startDate,
      endDate,
      timezone,
    );
    const { groupByCreatedAtDayGames } = results;
    const getGamesQuery = `query GetAllGames {
      game_name {
        name
      }
    }`;
    const fetchAvailableGames = await this.gqlService.client.request(getGamesQuery);
    const gamesAvailable: string[] = fetchAvailableGames.game_name.map((data) => data.name);

    for (const [createdAtDay, gamesArr] of Object.entries(groupByCreatedAtDayGames)) {
      const seenGames = new Set();
      gamesArr.forEach((game) => {
        const isSeen = seenGames.has(game.game);
        if (!isSeen) {
          seenGames.add(game.game);
        }
      });
      const engagementPercentage =
        parseFloat((seenGames.size / gamesAvailable.length).toFixed(2)) * 100;
      engagmentStore[createdAtDay] = engagementPercentage;
    }

    return {
      labels: Object.keys(engagmentStore).map((key) => new Date(key)),
      engagementPercentage: Object.values(engagmentStore),
    };
  }
}
