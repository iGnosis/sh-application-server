import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import { SubscriptionPlanService } from 'src/services/subscription-plan/subscription-plan.service';
import { OrganizationPaymentController } from './organization-payment.controller';

describe('OrganizationPaymentController', () => {
  let controller: OrganizationPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationPaymentController],
      providers: [StripeService, ConfigService, SubscriptionPlanService, GqlService],
    }).compile();

    controller = module.get<OrganizationPaymentController>(OrganizationPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
