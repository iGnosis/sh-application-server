import { Controller, HttpCode, Get, Response, StreamableFile, Query } from '@nestjs/common';
import { PollyService } from 'src/services/clients/polly/polly.service';
import { SpeechSynthesisDto } from './speech-synthesis.dto';

@Controller('speech')
export class SpeechSynthesisController {
  constructor(private pollyService: PollyService) {}

  @HttpCode(200)
  @Get('generate')
  generateSpeech(
    @Query() body: SpeechSynthesisDto,
    @Response({ passthrough: true }) res,
  ): Promise<StreamableFile> {
    const result = this.pollyService.generateSpeech(body.text);
    res.set({
      'Content-Type': 'audio/mpeg',
    });
    return result;
  }
}
