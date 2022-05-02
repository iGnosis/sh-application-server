import { Module } from '@nestjs/common';
import { JwtService } from 'src/services/jwt/jwt.service';
import { PollyService } from 'src/speechSynthesis/polly/polly.service';
import { SpeechSynthesisController } from './speechSynthesis.controller';

@Module({
  controllers: [SpeechSynthesisController],
  providers: [JwtService, PollyService],
})
export class SpeechSynthesisModule {}
