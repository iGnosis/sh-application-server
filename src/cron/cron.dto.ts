import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CronDto {
  @ApiProperty({
    description: 'Unique ID of the cron job.',
  })
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Time when cron was run.',
  })
  @IsNotEmpty()
  scheduled_time: string;

  @ApiProperty({
    description: 'Name of the cron job',
  })
  @IsNotEmpty()
  name: string;
}
