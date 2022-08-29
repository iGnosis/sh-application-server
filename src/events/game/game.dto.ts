import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class GameStarted {
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

export class GameEnded {
  @ApiProperty({
    description: 'Game UUID.',
  })
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({
    description: 'Patient UUID.',
  })
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: 'Timestamp of when the game was ended.',
  })
  @IsNotEmpty()
  endedAt: Date;
}
