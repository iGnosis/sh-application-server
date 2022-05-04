import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SpeechSynthesisDto {
  @ApiProperty({
    description: 'Text to be converted to speech.',
  })
  @IsNotEmpty()
  text: string;
}
