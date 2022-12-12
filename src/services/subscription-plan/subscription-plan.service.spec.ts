import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../clients/gql/gql.service';
import { SubscriptionPlanService } from './subscription-plan.service';

describe('SubscriptionPlanService', () => {
  let service: SubscriptionPlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionPlanService, GqlService, ConfigService],
    }).compile();

    service = module.get<SubscriptionPlanService>(SubscriptionPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
