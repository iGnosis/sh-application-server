import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { AnalyticsDTO } from 'src/types/global';

export class SetGameEndedatEvent {
  @ApiProperty({
    description: 'Game ended at event.',
  })
  @IsNotEmpty()
  payload: {
    gameId: string;
    createdAt: string;
  };
  comment: string;
}

export class GameStarted {
  @ApiProperty({
    description: 'Game UUID.',
  })
  @IsNotEmpty()
  gameId: string;

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
    description: 'Organization UUID.',
  })
  @IsNotEmpty()
  organizationId: string;

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

export class GameCompletedPinpoint {
  @ApiProperty({
    description: 'Start date.',
  })
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'Current date.',
  })
  @IsNotEmpty()
  currentDate: Date;

  @ApiProperty({
    description: 'End date.',
  })
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({
    description: 'Timezone of the user',
  })
  @IsNotEmpty()
  userTimezone: string;
}
