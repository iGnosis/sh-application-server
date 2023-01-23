import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ErpnextService } from './erpnext.service';

describe('ErpnextService', () => {
  let service: ErpnextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErpnextService, ConfigService, Logger],
    }).compile();

    service = module.get<ErpnextService>(ErpnextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
