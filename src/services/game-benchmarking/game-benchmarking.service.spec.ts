import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ExtractInformationService } from '../extract-information/extract-information.service';
import { GqlService } from '../clients/gql/gql.service';
import { GameBenchmarkingService } from './game-benchmarking.service';

describe('GameBenchmarkingService', () => {
  let service: GameBenchmarkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameBenchmarkingService, GqlService, ConfigService, ExtractInformationService],
    }).compile();

    service = module.get<GameBenchmarkingService>(GameBenchmarkingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch game benchmarks', async () => {
    // Given
    const newGameId = '798ff028-daa1-4c1b-a52d-286a1e0f4286';

    // When
    const resp = await service.fetchGameBenchmarks(newGameId);

    // Then
    expect(resp).toBeDefined();
    expect(resp.id).toBeDefined();
    expect(resp.gameId).toBeDefined();
    expect(resp.createdAt).toBeDefined();
    expect(resp.analytics).toBeDefined();
  });

  it('should generate report', async () => {
    // Given
    const newGameId = '798ff028-daa1-4c1b-a52d-286a1e0f4286';
    const benchMarkConfigId = '5ed3bb8f-bd99-4282-8edd-1f1f070432b5';

    // When
    const reportMetrics = await service.generateReport(newGameId, benchMarkConfigId);
    const report = await service.createExcelReport(reportMetrics);
    // console.log(reportMetrics);
    // console.log(report);

    // Then
    expect(reportMetrics).toBeDefined();
    expect(report).toBeDefined();
  });

  it('should update game benchmark config with download URLs ', async () => {
    // Given
    const benchmarkConfigId = '5ed3bb8f-bd99-4282-8edd-1f1f070432b5';
    const rawVideoUrl =
      'https://soundhealth-benchmark-videos.s3.amazonaws.com/798ff028-daa1-4c1b-a52d-286a1e0f4286/webcam';
    const screenRecordingUrl = 'nestjs-test-screen-capture-download-url';

    // When
    const resp = await service.updateBenchmarkConfigVideoUrls(
      benchmarkConfigId,
      rawVideoUrl,
      screenRecordingUrl,
    );

    // Then
    expect(resp).toBeDefined();
    expect(resp.update_game_benchmark_config_by_pk).toBeDefined();
    expect(resp.update_game_benchmark_config_by_pk.rawVideoUrl).toBe(rawVideoUrl);
    expect(resp.update_game_benchmark_config_by_pk.screenRecordingUrl).toBe(screenRecordingUrl);
  });

  describe('Calculate relative percentage difference', () => {
    it('increase', () => {
      // Given
      const manuallyCalculatedVal = 100;
      const benchmarkVal = 150;

      // When
      const percentageDiff = service.calcPercentageChange(manuallyCalculatedVal, benchmarkVal);

      // Then
      expect(percentageDiff).toBe(50);
    });

    it('decrease', () => {
      // Given
      const manuallyCalculatedVal = 100;
      const benchmarkVal = 50;

      // When
      const percentageDiff = service.calcPercentageChange(manuallyCalculatedVal, benchmarkVal);

      // Then
      expect(percentageDiff).toBe(-50);
    });

    it('no-change #1', () => {
      // Given
      const manuallyCalculatedVal = 100;
      const benchmarkVal = 100;

      // When
      const percentageDiff = service.calcPercentageChange(manuallyCalculatedVal, benchmarkVal);

      // Then
      expect(percentageDiff).toBe(0);
    });

    it('no-change #2', () => {
      // Given
      const manuallyCalculatedVal = 0;
      const benchmarkVal = 0;

      // When
      const percentageDiff = service.calcPercentageChange(manuallyCalculatedVal, benchmarkVal);

      // Then
      expect(percentageDiff).toBe(0);
    });
  });
});
