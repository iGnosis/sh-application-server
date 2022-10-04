import { Injectable } from '@nestjs/common';
import { groupBy as _groupBy } from 'lodash';
import {
  BenchmarkReport,
  GameBenchmark,
  GameManualCalculations,
} from 'src/types/game-benchmarking';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class GameBenchmarkingService {
  constructor(private gqlService: GqlService) {}

  async fetchGameBenchmarks(benchmarkId: string): Promise<GameBenchmark> {
    const query = `query FetchGameBenchmarks($benchmarkId: uuid!) {
      game_benchmarks_by_pk(id: $benchmarkId) {
        id
        gameId
        createdAt
        analytics
      }
    }`;

    const resp: GameBenchmark = await this.gqlService.client.request(query, { benchmarkId });
    resp.game_benchmarks_by_pk.analytics.sort((a, b) => {
      return a.prompt.timestamp - b.prompt.timestamp;
    });
    return resp;
  }

  async fetchGameManualCalculations(gameId: string): Promise<GameManualCalculations> {
    const query = `query FetchManualCalculations($gameId: uuid!) {
      game_manual_calculations(where: {gameId: {_eq: $gameId}}) {
        gameId
        promptId
        createdAt
        updatedAt
        metricName
        metricValue
      }
    }`;
    return await this.gqlService.client.request(query, { gameId });
  }

  /**
   * Calculates percentage change from `expectedValue` to `newValue`.
   */
  calcPercentageChange(expectedValue: number, newValue: number) {
    if (expectedValue == 0) return 0;
    return ((newValue - expectedValue) / Math.abs(expectedValue)) * 100;
  }

  /**
   * Things to compare
   * 1. Completion Time in ms
   * 2. was it successful or not?
   */
  async generateReport(gameId: string, benchmarkId: string): Promise<any> {
    const manualCalculations = await this.fetchGameManualCalculations(gameId);
    const benchmarkedAnalytics = await this.fetchGameBenchmarks(benchmarkId);
    const results: BenchmarkReport[] = [];

    benchmarkedAnalytics.game_benchmarks_by_pk.analytics.forEach((benchmark) => {
      // get all the manual calculations for the current prompt.
      const manualCalcForCurrentBenchmarkPrompt =
        manualCalculations.game_manual_calculations.filter(
          (val) => benchmark.prompt.id == val.promptId,
        );

      manualCalcForCurrentBenchmarkPrompt.forEach((manualCalcVals) => {
        if (manualCalcVals.metricName === 'isSuccess') {
          results.push({
            promptId: benchmark.prompt.id,
            timestamp: benchmark.prompt.timestamp,
            metricName: 'isSuccess',
            benchmarkValue: benchmark.result.score,
            manualValue: manualCalcVals.metricValue,
          });
        }

        if (manualCalcVals.metricName === 'completionTimeInMs') {
          const percentageDiff = this.calcPercentageChange(
            manualCalcVals.metricValue,
            benchmark.reaction.completionTimeInMs || 0,
          );
          results.push({
            promptId: benchmark.prompt.id,
            timestamp: benchmark.prompt.timestamp,
            metricName: 'completionTimeInMs',
            benchmarkValue: benchmark.reaction.completionTimeInMs || 0,
            manualValue: manualCalcVals.metricValue,
            relativePercentageDiff: percentageDiff,
          });
        }
      });
    });

    return results;
    // return _groupBy(results, 'promptId');
  }
}
