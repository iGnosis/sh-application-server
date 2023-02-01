import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { EventsService } from 'src/services/events/events.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import { SubscriptionService } from 'src/services/subscription/subscription.service';
import { PatientPaymentController } from './patient-payment.controller';

describe('PatientPaymentController', () => {
  let controller: PatientPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientPaymentController],
      providers: [
        StripeService,
        ConfigService,
        SubscriptionService,
        GqlService,
        EventsService,
        Logger,
      ],
    }).compile();

    controller = module.get<PatientPaymentController>(PatientPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
