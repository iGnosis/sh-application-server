import {
  Controller,
  HttpCode,
  Get,
  Response,
  StreamableFile,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PollyService } from 'src/speech-synthesis/polly/polly.service';
import { SpeechSynthesisDto } from './speech-synthesis.dto';

@Controller('speech')
// @Roles(Role.PATIENT, Role.PLAYER, Role.THERAPIST)
// @UseGuards(AuthGuard, RolesGuard)
// @ApiBearerAuth('access-token')
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
