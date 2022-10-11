import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';

export class TranscodeVideoAPI {
  @ApiProperty({
    description: 'benchmark config uuid',
  })
  @IsUUID()
  benchmarkConfigId: string;

  @ApiProperty({
    description: 'type of video to transcode',
  })
  @IsNotEmpty()
  @IsIn(['webcam', 'screen-capture'])
  type: string;
}
