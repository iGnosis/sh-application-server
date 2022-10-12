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
    const bucketName = 'soundhealth-benchmark-videos';
    const completeFilePath = 'test/hello.html';

    // When
    const signedUrl = await service.putObjectSignedUrl(bucketName, completeFilePath);

    // Then
    console.log(signedUrl);
    expect(signedUrl).toBeDefined();
  });

  xit('should generate a signed URL for GETting an object', async () => {
    // Given
    const bucketName = 'soundhealth-benchmark-videos';
    const completeFilePath = 'test/hello.pdf';

    // When
    const signedUrl = await service.getObjectedSignedUrl(
      bucketName,
      completeFilePath,
      7 * 24 * 60 * 60,
    );

    // Then
    expect(signedUrl).toBeDefined();
  });
});
