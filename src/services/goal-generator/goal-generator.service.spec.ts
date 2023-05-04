import { Test, TestingModule } from '@nestjs/testing';
import { GoalGeneratorService } from './goal-generator.service';
import { Badge, Goal, PatientBadge, UserContext } from 'src/types/global';
import { GoalStatus, Metrics } from 'src/types/enum';
import { GqlService } from '../clients/gql/gql.service';
import { ConfigService } from '@nestjs/config';
import { StatsService } from '../patient-stats/stats.service';
import { GameService } from '../game/game.service';
import { DatabaseModule } from 'src/database/database.module';

describe('GoalGeneratorService', () => {
  let service: GoalGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalGeneratorService, GqlService, ConfigService, StatsService, GameService],
      imports: [DatabaseModule],
    }).compile();

    service = module.get<GoalGeneratorService>(GoalGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  xit('should generate goals', async () => {
    const patientId = '111';
    // Given
    const userContext: UserContext = {
      PATIENT_STREAK: 7,
    };

    const userBadges: PatientBadge[] = [];
    const achievableBadges: Badge[] = await service.getAchievableBadges(userContext, userBadges);

    // When
    const goals = await service.generateGoals(patientId);
    console.log('goals::', goals);

    // Then
    const goal1: Goal = {
      patientId: '111',
      name: 'Login in for 10 days in a row',
      status: GoalStatus.COMPLETED,
      rewards: [
        {
          id: '111',
          dimension: 'patient',
          metric: Metrics.PATIENT_STREAK,
          minVal: 10,
          maxVal: null,
          name: 'Streak_10',
          tier: 'bronze',
          status: 'active',
        },
      ],
    };
    expect(goals).toContain(goal1);
  });
});
