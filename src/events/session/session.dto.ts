import { IsNotEmpty } from 'class-validator';

export class SessionEventTriggerDto {
  @IsNotEmpty()
  endedAt: Date;

  @IsNotEmpty()
  patientId: string;
}
