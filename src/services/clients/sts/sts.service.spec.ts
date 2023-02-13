import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StsService } from './sts.service';

describe('StsService', () => {
  let service: StsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StsService, ConfigService],
    }).compile();

    service = module.get<StsService>(StsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  xit('should assume a role', async () => {
    // Given
    const bucket = 'testers-screen-rec';
    const filePath = 'local/1331112';

    // When
    const data = await service.putObjStsAssumeRole(bucket, filePath);

    // Then
    console.log(data);
    expect(data).toHaveProperty('AccessKeyId');
    expect(data).toHaveProperty('SecretAccessKey');
    expect(data).toHaveProperty('SessionToken');
    expect(data).toHaveProperty('Expiration');
  });
});
