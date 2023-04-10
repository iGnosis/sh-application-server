import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { GqlService } from '../clients/gql/gql.service';
import { ConfigService } from '@nestjs/config';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, GqlService, ConfigService],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
