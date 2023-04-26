import { Test, TestingModule } from '@nestjs/testing';
import { GoalGeneratorService } from './goal-generator.service';
import { Goal, UserContext } from 'src/types/global';

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

  xit('should streak generate goals', () => {
    // Given
    const userContext: UserContext = {
      patient_streak: 6,
    };

    // When
    const goals = service.generateGoalsFromContext(userContext);

    // Then
    const goal1: Goal = {
      id: '124',
      patientId: '111',
      name: 'Login in for 10 days',
      rewards: [
        {
          id: '111',
          metric: 'patient_streak',
          name: 'Streak_10',
          tier: 'bronze',
        },
      ],
    };
    expect(goals).toContain(goal1);
  });
});
