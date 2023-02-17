import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BuildVersionController } from './build-version.controller';

describe('BuildVersionController', () => {
  let controller: BuildVersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildVersionController],
      providers: [ConfigService],
    }).compile();

    controller = module.get<BuildVersionController>(BuildVersionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should fetch build version', () => {
    const buildVersion = controller.buildVersion();
    expect(buildVersion).toBeDefined();
  });
});
