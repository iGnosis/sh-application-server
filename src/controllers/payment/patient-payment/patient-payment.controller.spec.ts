import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import { PatientPaymentController } from './patient-payment.controller';

describe('PatientPaymentController', () => {
  let controller: PatientPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientPaymentController],
      providers: [StripeService, ConfigService, GqlService],
    }).compile();

    controller = module.get<PatientPaymentController>(PatientPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
