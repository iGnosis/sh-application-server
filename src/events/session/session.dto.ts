import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SessionEventTriggerDto {
  @ApiProperty({
    description: 'Timestamp of when the session ended.',
  })
  @IsNotEmpty()
  endedAt: Date;

  @ApiProperty({
    description: 'Patient UUID.',
  })
  @IsNotEmpty()
  patientId: string;
}
