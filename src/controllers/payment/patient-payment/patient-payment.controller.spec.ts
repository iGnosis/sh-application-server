import { Test, TestingModule } from '@nestjs/testing';
import { PatientPaymentController } from './patient-payment.controller';

describe('PatientPaymentController', () => {
  let controller: PatientPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientPaymentController],
    }).compile();

    controller = module.get<PatientPaymentController>(PatientPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
