import { Test, TestingModule } from '@nestjs/testing';
import { CognitoController } from './cognito.controller';

describe('CognitoController', () => {
  let controller: CognitoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CognitoController],
    }).compile();

    controller = module.get<CognitoController>(CognitoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
