import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LogReportService } from './log-report.service';

describe('LogReportService', () => {
  let service: LogReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogReportService, ConfigService],
    }).compile();

    service = module.get<LogReportService>(LogReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
