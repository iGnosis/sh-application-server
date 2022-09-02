import { Injectable } from '@nestjs/common';
import { groupBy as lodashGroupBy } from 'lodash';
import { StatsService } from 'src/patient/stats/stats.service';
import { PlotChartDTO } from 'src/types/provider-charts';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class ProviderChartsService {
  constructor(private statService: StatsService, private gqlService: GqlService) {}

  getAdheranceChart() {
    throw new Error('Not Yet Implemented.');
    const apiResponse = {
      labels: ['Active Patients', 'Inactive Patients'],
      pieChartDataset: [11, 4],
      backgroundColor: ['#ffa2ad', '#2f51ae'],
    };
    return apiResponse;
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
      return await this.statService.getAvgAchievementPercentageGroupByGames(query);
    } else {
      return await this.statService.getAvgAchievementPercentage(query);
    }
  }

  async getPatientEngagement(patientId: string, startDate: Date, endDate: Date, timezone: string) {
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
