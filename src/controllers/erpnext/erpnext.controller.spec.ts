import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ErpnextService } from 'src/services/erpnext/erpnext.service';
import { ErpnextController } from './erpnext.controller';

describe('ErpnextController', () => {
  let controller: ErpnextController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErpnextController],
      providers: [ConfigService, ErpnextService, Logger],
    }).compile();

    controller = module.get<ErpnextController>(ErpnextController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
