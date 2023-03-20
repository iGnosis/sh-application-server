import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DashboardMetricEnum } from 'src/types/enum';

export class DashboardDto {
  @ApiProperty({
    description: 'Start date',
  })
  startDate: Date;

  @ApiProperty({
    description: 'endDate',
  })
  endDate: Date;

  @ApiProperty({
    description: 'type of metric to calculate',
  })
  @IsEnum(DashboardMetricEnum)
  type: DashboardMetricEnum;
}
