import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from 'src/database/database.module';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, Logger],
      imports: [DatabaseModule],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate percentage increase', () => {
    // Given
    const oldVal = 50;
    const newVal = 51;

    // When
    const perDiff = service.percentageDiff(newVal, oldVal);

    // Then
    expect(perDiff).toEqual(2);
  });

  it('should calculate percentage decrease', () => {
    // Given
    const oldVal = 50;
    const newVal = 0;

    // When
    const perDiff = service.percentageDiff(newVal, oldVal);

    // Then
    expect(perDiff).toEqual(-100);
  });
});
