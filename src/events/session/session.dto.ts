import { IsNotEmpty } from 'class-validator';

export class SessionEventTriggerDto {
  @IsNotEmpty()
  sessionId: string;

  @IsNotEmpty()
  createdAt: Date;

  @IsNotEmpty()
  patientId: string;
}

export class SessionEndEventDto {
  @IsNotEmpty()
  payload: {
    sessionId: string;
    createdAt: Date;
    patientId: string;
  };
  comment: string;
}
