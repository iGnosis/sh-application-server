import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class NewPatientDto {
  @ApiProperty({
    description: 'Patient uuid',
  })
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Patient email',
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Patient nickname',
  })
  @IsNotEmpty()
  nickname: string;
}

export class FeedbackReceivedEvent {
  @ApiProperty({
    description: 'Feedback event to send an email.',
  })
  @IsNotEmpty()
  payload: {
    feedbackId: string;
  };
  comment: string;
}
