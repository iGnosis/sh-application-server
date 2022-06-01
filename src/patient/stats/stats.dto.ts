import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class Daily {
  @ApiProperty({
    description: 'Day for which to fetch the stats.',
  })
  @IsNotEmpty()
  day: number;
}