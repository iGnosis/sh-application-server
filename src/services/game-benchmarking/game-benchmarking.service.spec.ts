import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../gql/gql.service';
import { GameBenchmarkingService } from './game-benchmarking.service';

describe('GameBenchmarkingService', () => {
  let service: GameBenchmarkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameBenchmarkingService, GqlService, ConfigService],
    }).compile();

    service = module.get<GameBenchmarkingService>(GameBenchmarkingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch game benchmarks', async () => {
    // Given
    const testBenchmarkId = 'ef6c7f78-70fb-47a0-9e69-126aeea8bf5c';

    // When
    const resp = await service.fetchGameBenchmarks(testBenchmarkId);

    // Then
    expect(resp).toBeDefined();
    expect(resp.game_benchmarks_by_pk).toBeDefined();
    expect(resp.game_benchmarks_by_pk.id).toBeDefined();
    expect(resp.game_benchmarks_by_pk.gameId).toBeDefined();
    expect(resp.game_benchmarks_by_pk.createdAt).toBeDefined();
    expect(resp.game_benchmarks_by_pk.analytics).toBeDefined();
  });

  it('should fetch game manual calculations', async () => {
    // Given
    const testGameId = '798ff028-daa1-4c1b-a52d-286a1e0f4286';

    // When
    const resp = await service.fetchGameManualCalculations(testGameId);

    // Then
    expect(resp).toBeDefined();
    expect(resp.game_manual_calculations).toBeInstanceOf(Array);
    expect(resp.game_manual_calculations[0]).toHaveProperty('gameId');
    expect(resp.game_manual_calculations[0]).toHaveProperty('promptId');
    expect(resp.game_manual_calculations[0]).toHaveProperty('createdAt');
    expect(resp.game_manual_calculations[0]).toHaveProperty('updatedAt');
    expect(resp.game_manual_calculations[0]).toHaveProperty('metricName');
    expect(resp.game_manual_calculations[0]).toHaveProperty('metricValue');
  });

  it('should generate report', async () => {
    // Given
    const testGameId = '798ff028-daa1-4c1b-a52d-286a1e0f4286';
    const testBenchmarkId = 'ef6c7f78-70fb-47a0-9e69-126aeea8bf5c';

    // When
    const results = await service.generateReport(testGameId, testBenchmarkId);

    // Then
    // console.log(results);
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
