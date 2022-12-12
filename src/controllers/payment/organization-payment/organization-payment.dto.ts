import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class SubscriptionPlanBody {
  @ApiProperty({
    description: 'Subscription Fee for the organization (in dollars)',
  })
  @IsNumber({
    maxDecimalPlaces: 0,
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
