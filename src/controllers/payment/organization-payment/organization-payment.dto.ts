import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class SubscriptionPlanBody {
  @ApiProperty({
    description: 'Subscription Fee for the organization (in dollars)',
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  subscriptionFee: number;

  @ApiProperty({
    description: 'Trial period for the subscription plan',
  })
  @IsNumber()
  @IsNotEmpty()
  trialPeriod: number;
}

export class GenerateReportBody {
  @ApiProperty({
    description: 'Start date of the report',
  })
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of the report',
  })
  @IsNotEmpty()
  endDate: string;
}
