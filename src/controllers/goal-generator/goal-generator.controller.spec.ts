import { Test, TestingModule } from '@nestjs/testing';
import { GoalGeneratorController } from './goal-generator.controller';

describe('GoalGeneratorController', () => {
  let controller: GoalGeneratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalGeneratorController],
    }).compile();

    controller = module.get<GoalGeneratorController>(GoalGeneratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
