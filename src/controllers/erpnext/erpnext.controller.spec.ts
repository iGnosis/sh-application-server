import { Test, TestingModule } from '@nestjs/testing';
import { ErpnextController } from './erpnext.controller';

describe('ErpnextController', () => {
  let controller: ErpnextController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErpnextController],
    }).compile();

    controller = module.get<ErpnextController>(ErpnextController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
