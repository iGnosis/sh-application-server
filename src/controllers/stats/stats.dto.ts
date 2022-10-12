import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, ValidateNested } from 'class-validator';

export class DailyGoalsInput {
  @ApiProperty({
    description: 'Date for which to fetch the stats.',
  })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    description: 'Activity IDs to be evaulated.',
  })
  @IsNotEmpty()
  activityIds: Array<string>;
}

export class DailyGoalsDto {
  @ApiProperty({
    description: 'Hasura input.',
  })
  @ValidateNested()
  input: DailyGoalsInput;
}
