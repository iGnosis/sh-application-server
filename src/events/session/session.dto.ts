import { IsNotEmpty } from 'class-validator';

export class SessionEventTriggerDto {
  @IsNotEmpty()
  sessionId: string;

  @IsNotEmpty()
  endedAt: Date;

  @IsNotEmpty()
  patientId: string;
}
