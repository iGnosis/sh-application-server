import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NovuService } from './novu.service';

describe('NovuService', () => {
  let service: NovuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NovuService, ConfigService],
    }).compile();

    service = module.get<NovuService>(NovuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update paymentMade to true', async () => {
    const patientId = '542476cb-4e94-46d9-987f-b01f0679054b';
    const resp = await service.novuClient.subscribers.update(patientId, {
      data: {
        paymentMade: true,
      },
    });
    console.log(resp.data);
    expect(resp).toBeTruthy();
  });

  it('should update paymentMade to false', async () => {
    const patientId = '542476cb-4e94-46d9-987f-b01f0679054b';
    const resp = await service.novuClient.subscribers.update(patientId, {
      data: {
        paymentMade: false,
      },
    });
    console.log(resp);
    expect(resp).toBeTruthy();
  });
});
