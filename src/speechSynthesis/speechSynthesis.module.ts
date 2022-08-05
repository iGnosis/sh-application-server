import { Module } from '@nestjs/common';
import { Auth0Service } from 'src/auth/auth0/auth0.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { PollyService } from 'src/speechSynthesis/polly/polly.service';
import { SpeechSynthesisController } from './speechSynthesis.controller';

@Module({
  controllers: [SpeechSynthesisController],
  providers: [JwtService, PollyService, Auth0Service],
})
export class SpeechSynthesisModule {}
