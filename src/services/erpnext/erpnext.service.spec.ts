import { Test, TestingModule } from '@nestjs/testing';
import { ErpnextService } from './erpnext.service';

describe('ErpnextService', () => {
  let service: ErpnextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErpnextService],
    }).compile();

    service = module.get<ErpnextService>(ErpnextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
