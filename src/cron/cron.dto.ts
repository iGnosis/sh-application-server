import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SessionEventTriggerRequestDto {
  @ApiProperty({
    description: 'Session ID for which to schedule the inspection.',
  })
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Session creation date.',
  })
  @IsNotEmpty()
  createdAt: Date;
}

export class SessionInspectorEvent {
  @ApiProperty({
    description: 'Session payload for which to schedule the inspection.',
  })
  @IsNotEmpty()
  payload: {
      payload: {
        sessionId: string;
        createdAt: Date;
      };
    comment: string;
  };
}
