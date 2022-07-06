import { Module } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito/cognito.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { PollyService } from 'src/speechSynthesis/polly/polly.service';
import { SpeechSynthesisController } from './speechSynthesis.controller';

@Module({
  controllers: [SpeechSynthesisController],
  providers: [JwtService, PollyService, CognitoService],
})
export class SpeechSynthesisModule {}
