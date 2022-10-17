import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PollyService } from 'src/services/clients/polly/polly.service';
import { SpeechSynthesisController } from './speech-synthesis.controller';

describe('SpeechSynthesisController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [SpeechSynthesisController],
      providers: [PollyService, ConfigService],
    }).compile();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const speechSynthesisController =
        app.get<SpeechSynthesisController>(SpeechSynthesisController);
      expect(
        speechSynthesisController.generateSpeech(
          {
            text: 'Hey',
          },
          {
            set: (obj) => obj,
          },
        ),
      ).toBeTruthy();
    });
  });
});
