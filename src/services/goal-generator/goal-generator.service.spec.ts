import { Test, TestingModule } from '@nestjs/testing';
import { GoalGeneratorService } from './goal-generator.service';

describe('GoalGeneratorService', () => {
  let service: GoalGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalGeneratorService],
    }).compile();

    service = module.get<GoalGeneratorService>(GoalGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
