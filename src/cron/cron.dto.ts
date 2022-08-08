import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
export class ScheduleEmailFeedback {
  @ApiProperty({
    description: 'Feedback ID to be scheduled for email delivery',
  })
  @IsNotEmpty()
  feedbackId: string;
}
