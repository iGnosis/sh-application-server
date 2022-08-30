import { Test, TestingModule } from '@nestjs/testing';
import { ExtractInformationService } from './extract-information.service';

describe('ExtractInformationService', () => {
  let service: ExtractInformationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtractInformationService],
    }).compile();

    service = module.get<ExtractInformationService>(ExtractInformationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
