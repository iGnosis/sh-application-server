import {
  Controller,
  HttpCode,
  Get,
  Response,
  StreamableFile,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from 'src/services/guard/auth.guard';
import { PollyService } from 'src/speechSynthesis/polly/polly.service';

@Controller('speech')
@UseGuards(AuthGuard)
export class SpeechSynthesisController {
  constructor(private pollyService: PollyService) { }

  @HttpCode(200)
  @Get('generate')
  func(@Query('text') text: string, @Response({ passthrough: true }) res): Promise<StreamableFile> {
    const result = this.pollyService.generateSpeech(text);
    res.set({
      'Content-Type': 'audio/mpeg',
    });
    return result;
  }
}
