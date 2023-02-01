import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { groupBy as _groupBy, mean as _mean, isEmpty as _isEmpty } from 'lodash';
import {
  BenchmarkConfig,
  BenchmarkReport,
  GameBenchmark,
  GameInfo,
} from 'src/types/game-benchmarking';
import { GqlService } from '../clients/gql/gql.service';
import { Workbook, Worksheet } from 'exceljs';
import * as tmp from 'tmp';
import { ExtractInformationService } from '../extract-information/extract-information.service';

@Injectable()
export class GameBenchmarkingService {
  constructor(
    private gqlService: GqlService,
    private extractInformationService: ExtractInformationService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(GameBenchmarkingService.name);
  }

  async fetchGameInfo(newGameId: string): Promise<GameInfo> {
    const query = `query FetchGameInfo($newGameId: uuid!) {
      game_by_pk(id: $newGameId) {
        gameId: id
        createdAt
        game_name {
          name
        }
        patientByPatient {
          nickname
        }
      }
    }`;
    return await this.gqlService.client.request(query, { newGameId });
  }

  async fetchGameBenchmarks(newGameId: string): Promise<GameBenchmark> {
    const query = `query FetchGameBenchmarks($newGameId: uuid!) {
      game_benchmarks(where: {gameId: {_eq: $newGameId}}) {
        id
        gameId
        createdAt
        analytics
      }
    }`;

    // TODO: turn `gameId` into primary key (?)
    const resp = await this.gqlService.client.request(query, { newGameId });
    return resp.game_benchmarks[0];
  }

  async fetchBenchmarkConfig(benchmarkConfigId: string): Promise<BenchmarkConfig> {
    const query = `query FetchBenchmarkConfig($benchmarkConfigId: uuid!) {
      game_benchmark_config_by_pk(id: $benchmarkConfigId) {
        id
        createdAt
        updatedAt
        manualCalculations
        rawVideoUrl
        screenRecordingUrl
        originalGameId
      }
    }`;
    return await this.gqlService.client.request(query, { benchmarkConfigId });
  }

  async updateBenchmarkConfigVideoUrls(
    benchmarkConfigId: string,
    rawVideoUrl: string,
    screenRecordingUrl: string,
  ) {
    const query = `mutation UpdateBenchmarkConfig($benchmarkConfigId: uuid!, $rawVideoUrl: String!, $screenRecordingUrl: String!) {
      update_game_benchmark_config_by_pk(pk_columns: {id: $benchmarkConfigId}, _set: {rawVideoUrl: $rawVideoUrl, screenRecordingUrl: $screenRecordingUrl}) {
        originalGameId
        rawVideoUrl
        screenRecordingUrl
      }
    }`;
    return await this.gqlService.client.request(query, {
      benchmarkConfigId,
      rawVideoUrl,
      screenRecordingUrl,
    });
  }

  async setBenchmarkAvgAccuracy(gameId: string, avgAccuracy: any) {
    const query = `mutation SetAvgAccuracy($gameId: uuid!, $avgAccuracy: jsonb!) {
      update_game_benchmarks(where: {gameId: {_eq: $gameId}}, _set: {avgAccuracy: $avgAccuracy}) {
        affected_rows
      }
    }`;
    await this.gqlService.client.request(query, { gameId, avgAccuracy });
  }

  /**
   * Calculates percentage change from `expectedValue` to `newValue`.
   */
  calcPercentageChange(expectedValue: number, newValue: number) {
    if (expectedValue == 0) return 0;
    const perDiff = ((newValue - expectedValue) / Math.abs(expectedValue)) * 100;
    return parseFloat(perDiff.toFixed(2));
  }

  async generateReport(newGameId: string, benchmarkConfigId: string): Promise<BenchmarkReport> {
    const manualCalculations = await this.fetchBenchmarkConfig(benchmarkConfigId);

    if (_isEmpty(manualCalculations.game_benchmark_config_by_pk.manualCalculations)) {
      throw new HttpException(
        'No manual calculations found for this benchmark',
        HttpStatus.BAD_REQUEST,
      );
    }

    const benchmarkedAnalytics = await this.fetchGameBenchmarks(newGameId);
    const gameInfo = await this.fetchGameInfo(newGameId);

    const absDiffOfMetrics = {
      completionTimeInMs: [],
      isSuccess: [],
    };

    // DS which Excel will work on.
    const results: BenchmarkReport = {
      gameInfo: [],
      prompts: [],
      varience: [],
    };

    results.prompts.push([
      'Prompt ID',
      'Metric Name',
      'Manual Value',
      'Benchmark Value',
      'Percentage Diff',
    ]);

    benchmarkedAnalytics.analytics.forEach((benchmark) => {
      // ignore metadata prompts.
      if (benchmark.prompt.type !== 'start') {
        const manualCal =
          manualCalculations.game_benchmark_config_by_pk.manualCalculations[benchmark.prompt.id];

        const completionPerDiff = this.calcPercentageChange(
          manualCal.completionTimeInMs,
          benchmark.reaction.completionTimeInMs,
        );
        const completionPerDiffText =
          completionPerDiff === 0
            ? '' // no increase, nor decrease. results were perfect.
            : completionPerDiff < 0
            ? `${completionPerDiff}% decrease`
            : `${completionPerDiff}% increase`;

        results.prompts.push([
          benchmark.prompt.id,
          'completionTimeInMs',
          manualCal.completionTimeInMs,
          benchmark.reaction.completionTimeInMs || 0,
          completionPerDiffText,
        ]);
        results.prompts.push([
          benchmark.prompt.id,
          'isSuccess',
          manualCal.isSuccess ? 1 : 0,
          benchmark.result.score,
        ]);

        // compare two results
        absDiffOfMetrics.completionTimeInMs.push(
          Math.abs(manualCal.completionTimeInMs - benchmark.reaction.completionTimeInMs),
        );
        absDiffOfMetrics.isSuccess.push(
          Math.abs(manualCal.isSuccess ? 1 : 0 - benchmark.result.score),
        );
      }
    });

    const completionTimeAbsAvg = parseFloat(_mean(absDiffOfMetrics.completionTimeInMs).toFixed(2));
    const completionTimeAbsMedian = parseFloat(
      this.extractInformationService.median(absDiffOfMetrics.completionTimeInMs).toFixed(2),
    );
    const isSuccessAbsAvg = parseFloat(_mean(absDiffOfMetrics.isSuccess).toFixed(2));
    const isSuccessAbsMedian = parseFloat(
      this.extractInformationService.median(absDiffOfMetrics.isSuccess).toFixed(2),
    );

    await this.setBenchmarkAvgAccuracy(newGameId, {
      completionTimeAbsAvg,
      isSuccessAbsAvg,
    });

    // Populate Game Info
    results.gameInfo.push(['Game ID', gameInfo.game_by_pk.gameId]);
    results.gameInfo.push(['Game Name', gameInfo.game_by_pk.game_name.name]);
    results.gameInfo.push(['Created At', gameInfo.game_by_pk.createdAt]);
    results.gameInfo.push(['Player Nickname', gameInfo.game_by_pk.patientByPatient.nickname]);

    // Populate varience
    results.varience.push([
      'Metric Name',
      'Average Absolute Variation',
      'Median Absolute Variation',
    ]);
    results.varience.push(['completionTimeInMs', completionTimeAbsAvg, completionTimeAbsMedian]);
    results.varience.push(['isSuccess', isSuccessAbsAvg, isSuccessAbsMedian]);

    return results;
  }

  async createExcelReport(reportMetrics: BenchmarkReport) {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Game Report');

    for (const [_, value] of Object.entries(reportMetrics)) {
      value.forEach((val) => {
        sheet.addRow(val);
      });
      // add extra 5 rows for spacing.
      sheet.addRows([[], [], [], [], []]);
    }

    this.styleSheet(sheet);

    const excelFile: string = await new Promise((resolve, reject) => {
      tmp.file(
        {
          discardDescriptor: true,
          prefix: 'MyExcelSheet',
          postfix: '.xlsx',
          mode: parseInt('0600', 8),
        },
        async (err: any, file: any) => {
          if (err) {
            this.logger.error('createExcelReport: ' + JSON.stringify(err));
            throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
          }
          workbook.xlsx
            .writeFile(file)
            .then((_) => {
              resolve(file);
            })
            .catch((err) => {
              this.logger.error('createExcelReport: ', +JSON.stringify(err));
              throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
            });
        },
      );
    });
    return excelFile;
  }

  private styleSheet(sheet: Worksheet) {
    sheet.getColumn(1).width = 35.5;
    sheet.getColumn(2).width = 30.5;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 20;

    // sheet.getRow(1).alignment = {
    //   vertical: 'middle',
    //   horizontal: 'center',
    //   wrapText: true
    // }
  }
}
