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

  describe('median of numbers', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should calculate the median of odd-numbered dataset', () => {
      const result = service.median([5, 6, 50, 1, -5]);
      expect(result).toEqual(5);
    });

    it('should consider only first 3 numbers', () => {
      const result = service.median([5, 6, 50, 1, -5], 3);
      expect(result).toEqual(6);
    });

    it('should calculate the median of odd-numbered dataset', () => {
      const result = service.median([5, 6, 50, 1, -5, 12]);
      expect(result).toEqual(5.5);
    });

    it('should handle two numbers in a dataset', () => {
      const result = service.median([5, 6, 50, 1, -5, 12], 2);
      expect(result).toEqual(5.5);
    });

    it('should handle empty dataset', () => {
      const result = service.median([]);
      expect(result).toBeFalsy();
    });
  });
});
