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

  @ApiProperty({
    description: 'Patient ID associated with the session.',
  })
  @IsNotEmpty()
  patientId: string;
}

export class SessionInspectorEvent {
  @ApiProperty({
    description: 'Session payload for which to schedule the inspection.',
  })
  @IsNotEmpty()
  payload: {
    sessionId: string;
    createdAt: Date;
  };
  comment: string;
}

export class ScheduleEmailFeedback {
  @ApiProperty({
    description: 'Feedback ID to be scheduled for email delivery',
  })
  @IsNotEmpty()
  feedbackId: string;
}
