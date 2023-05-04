import { Test, TestingModule } from '@nestjs/testing';
import { GoalGeneratorController } from './goal-generator.controller';
import { GoalGeneratorService } from 'src/services/goal-generator/goal-generator.service';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { StatsService } from 'src/services/patient-stats/stats.service';
import { GameService } from 'src/services/game/game.service';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';

describe('GoalGeneratorController', () => {
  let controller: GoalGeneratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalGeneratorController],
      providers: [GoalGeneratorService, GqlService, StatsService, GameService, ConfigService],
      imports: [DatabaseModule],
    }).compile();

    controller = module.get<GoalGeneratorController>(GoalGeneratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
