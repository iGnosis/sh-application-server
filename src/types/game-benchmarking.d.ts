import { AnalyticsDTO } from './analytics';

export type metricNameEnum = 'isSuccess' | 'completionTimeInMs';

export interface GameBenchmark {
  game_benchmarks_by_pk: {
    id: string;
    gameId: string;
    createdAt: Date;
    analytics: AnalyticsDTO[];
  };
}

export interface GameManualCalculations {
  game_manual_calculations: {
    gameId: string;
    promptId: string;
    createdAt: Date;
    updatedAt: Date;
    metricName: metricNameEnum;
    metricValue: number;
  }[];
}

export type BenchmarkReport = {
  promptId: string;
  timestamp: number;
  metricName: metricNameEnum;
  manualValue: number;
  benchmarkValue: number;

  /**
   * Percentage difference from manual value to new value.
   */
  relativePercentageDiff?: number;
};
