import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationPaymentController } from './organization-payment.controller';

describe('OrganizationPaymentController', () => {
  let controller: OrganizationPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationPaymentController],
    }).compile();

    controller = module.get<OrganizationPaymentController>(OrganizationPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
