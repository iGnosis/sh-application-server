import { Module } from '@nestjs/common';
import { PollyService } from 'src/speechSynthesis/polly/polly.service';
import { SpeechSynthesisController } from './speechSynthesis.controller';

@Module({
  controllers: [SpeechSynthesisController],
  providers: [PollyService],
})
export class SpeechSynthesisModule {}
