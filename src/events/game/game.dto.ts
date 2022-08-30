import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { AnalyticsDTO } from 'src/types/analytics';

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
    description: 'Game Analytics.',
  })
  analytics: AnalyticsDTO[];

  @ApiProperty({
    description: 'Timestamp of when the game was ended.',
  })
  @IsNotEmpty()
  endedAt: Date;
}
