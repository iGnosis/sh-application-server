import { Module } from '@nestjs/common';
import { PollyService } from 'src/speech-synthesis/polly/polly.service';
import { SpeechSynthesisController } from './speech-synthesis.controller';

@Module({
  controllers: [SpeechSynthesisController],
  providers: [PollyService],
})
export class SpeechSynthesisModule {}
