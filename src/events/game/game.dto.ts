import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class GameEventTriggerDto {
  @ApiProperty({
    description: 'Patient UUID.',
  })
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: 'Timestamp of when the game was created.',
  })
  @IsNotEmpty()
  createdAt: Date;
}
