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
  email: string;

  @ApiProperty({
    description: 'Patient nickname',
  })
  nickname: string;

  @ApiProperty({
    description: 'Patient name prefix. eg (Mr. Mrs. Dr.)',
  })
  namePrefix: string;

  @ApiProperty({
    description: 'Patient first name',
  })
  firstName: string;

  @ApiProperty({
    description: 'Patient last name',
  })
  lastName: string;

  @ApiProperty({
    description: 'Patient phone country code',
  })
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({
    description: 'Patient phone number',
  })
  @IsNotEmpty()
  phoneNumber: string;
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
