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
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PollyService } from 'src/services/clients/polly/polly.service';
import { SpeechSynthesisDto } from './speech-synthesis.dto';

@Controller('speech')
// @Roles(UserRole.PATIENT, Role.PLAYER, Role.THERAPIST)
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
