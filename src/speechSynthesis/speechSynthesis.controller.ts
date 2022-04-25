import { Body, Controller, HttpCode, Post, Response, StreamableFile } from "@nestjs/common";
import { JwtService } from "src/services/jwt/jwt.service";
import { PollyService } from "src/speechSynthesis/polly/polly.service";

@Controller('speech')
export class SpeechSynthesisController {
  constructor(
    private jwtService: JwtService,
    private pollyService: PollyService
  ) { }

  @HttpCode(200)
  @Post('generate')
  func(@Body('text') text: string, @Response({ passthrough: true }) res): Promise<StreamableFile> {
    const result = this.pollyService.generateSpeech(text)
    res.set({
      'Content-Type': 'audio/mpeg',
    });
    return result
  }
}