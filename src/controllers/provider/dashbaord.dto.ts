import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DashboardMetricsEnums } from 'src/common/enums/enum';

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
  @IsEnum(DashboardMetricsEnums)
  type: DashboardMetricsEnums;
}
