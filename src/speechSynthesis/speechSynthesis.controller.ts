import {
  Body,
  Controller,
  HttpCode,
  Post,
  Response,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/services/guard/auth.guard';
import { PollyService } from 'src/speechSynthesis/polly/polly.service';
import { SpeechSynthesisDto } from './speechSynthesis.dto';

@Controller('speech')
@UseGuards(AuthGuard)
export class SpeechSynthesisController {
  constructor(private pollyService: PollyService) {}

  @HttpCode(200)
  @Post('generate')
  func(
    @Body() body: SpeechSynthesisDto,
    @Response({ passthrough: true }) res,
  ): Promise<StreamableFile> {
    const result = this.pollyService.generateSpeech(body.text);
    res.set({
      'Content-Type': 'audio/mpeg',
    });
    return result;
  }
}
