import { Test, TestingModule } from '@nestjs/testing';
import { GoalGeneratorService } from './goal-generator.service';
import { GqlService } from '../clients/gql/gql.service';
import { ConfigService } from '@nestjs/config';
import { StatsService } from '../patient-stats/stats.service';
import { GameService } from '../game/game.service';
import { DatabaseModule } from 'src/database/database.module';
import { Logger } from '@nestjs/common';

describe('GoalGeneratorService', () => {
  let service: GoalGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalGeneratorService,
        GqlService,
        ConfigService,
        StatsService,
        GameService,
        Logger,
      ],
      imports: [DatabaseModule],
    }).compile();

    service = module.get<GoalGeneratorService>(GoalGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
