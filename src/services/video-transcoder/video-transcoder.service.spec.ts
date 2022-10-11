import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { VideoTranscoderService } from './video-transcoder.service';

describe('VideoTranscoderService', () => {
  let service: VideoTranscoderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoTranscoderService, ConfigService],
    }).compile();

    service = module.get<VideoTranscoderService>(VideoTranscoderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
