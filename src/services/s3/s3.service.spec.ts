import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service, ConfigService],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  xit('should generate a signed URL for PUTting an object', async () => {
    // Given
    const bucketName = 'benchmark-videos';
    const completeFilePath = 'testKey';

    // When
    const signedUrl = await service.putObjectSignedUrl(bucketName, completeFilePath);

    // Then
    expect(signedUrl).toBeDefined();
  });

  xit('should generate a signed URL for GETting an object', async () => {
    // Given
    const bucketName = 'soundhealth-pose-data';
    const completeFilePath =
      'prod/03c235b6-75b6-405f-b424-b4f9b725ffac/10bf627b-2447-41fe-b660-6184ba84ca5e.json';

    // When
    const signedUrl = await service.getObjectedSignedUrl(bucketName, completeFilePath);

    // Then
    expect(signedUrl).toBeDefined();
  });
});
