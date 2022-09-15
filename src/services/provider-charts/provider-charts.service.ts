import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { StatsService } from 'src/patient/stats/stats.service';
import { AnalyticsDTO } from 'src/types/analytics';
import { GroupBy, PlotChartDTO, PlotHeatmapDTO } from 'src/types/provider-charts';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class ProviderChartsService {
  numberOfGamesAvailable: number;
  constructor(private statService: StatsService, private gqlService: GqlService) {
    // TODO: get activity count dynamically!
    this.numberOfGamesAvailable = 3;
  }
  async getGameAchievementRatio(gameId: string) {
    const query = `
      query GetGameAnalytics($gameId: uuid!) {
        game_by_pk(id: $gameId) {
          analytics
        }
      }`;

    const resp: {
      game_by_pk: {
        analytics: AnalyticsDTO[];
      };
    } = await this.gqlService.client.request(query, { gameId });

    const gameAnalytics = resp.game_by_pk.analytics;
    const totalSuccesScore = gameAnalytics.filter((val) => val.result.type === 'success').length;
    const totalIncorrectScore = gameAnalytics.filter((val) => val.result.type === 'failure').length;

    return {
      labels: ['Correct', 'Incorrect'],
      data: [totalSuccesScore, totalIncorrectScore],
    };
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
      return await this.statService.getAvgAchievementPercentageGroupByGames(query);
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
        const currentYear = new Date(result.createdAt).getFullYear();
        const currentMonth = new Date(result.createdAt).getMonth();
        const noOfDays = this.statService.getDaysInMonth(currentYear, currentMonth + 1);
        numOfGamesToBePlayed = noOfDays * this.numberOfGamesAvailable;
        console.table({
          currentYear,
          currentMonth,
          noOfDays,
          numOfGamesToBePlayed,
        });
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
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      numOfGamesToBePlayed =
        this.statService.getDaysInMonth(currentYear, currentMonth + 1) *
        this.numberOfGamesAvailable;
    }

    const results = await this.statService.getPatientAdherence(startDate, endDate, groupBy);
    return results.filter((val) => val.numOfGamesPlayed >= numOfGamesToBePlayed);
  }

  async getPatientsCompletionHeatmap(query: PlotHeatmapDTO) {
    const result = await this.statService.getPatientsMonthlyCompletion(query);
    return result;
  }
}
