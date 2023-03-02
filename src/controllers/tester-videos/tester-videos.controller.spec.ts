import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { StsService } from 'src/services/clients/sts/sts.service';
import { TesterVideosService } from 'src/services/tester-videos/tester-videos.service';
import { TesterVideosController } from './tester-videos.controller';

describe('TesterVideosController', () => {
  let controller: TesterVideosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TesterVideosController],
      providers: [S3Service, ConfigService, Logger, StsService, TesterVideosService, GqlService],
    }).compile();

    controller = module.get<TesterVideosController>(TesterVideosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
