import { AnalyticsDTO } from './analytics';

export type GameInfo = {
  game_by_pk: {
    gameId: string;
    createdAt: Date;
    game_name: {
      name: string;
    };
    patientByPatient: {
      nickname: string;
    };
  };
};

export interface GameBenchmark {
  id: string;
  gameId: string;
  createdAt: Date;
  analytics: AnalyticsDTO[];
}

export type BenchmarkConfig = {
  game_benchmark_config_by_pk: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    manualCalculations: {
      [key: string]: {
        isSuccess: boolean;
        completionTimeInMs: number;
      };
    };
    rawVideoUrl: string;
    screenRecordingUrl: string;
    originalGameId: string;
  };
};

export type BenchmarkReportOld = {
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

export type BenchmarkReport = {
  gameInfo: Array<any[]>;
  prompts: Array<any[]>;
  varience: Array<any[]>;
};
