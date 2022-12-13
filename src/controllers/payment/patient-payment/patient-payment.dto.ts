import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { CardDetailsDTO } from 'src/types/global';

export class AddPaymentMethodDTO {
  @ApiProperty({
    description: 'Card details',
  })
  @IsNotEmpty()
  cardDetails: CardDetailsDTO;
}

export class UpdatePaymentMethodDTO {
  @ApiProperty({
    description: 'PaymentMethodId',
  })
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiProperty({
    description: 'Card details',
  })
  @IsNotEmpty()
  cardDetails: {
    exp_month: number;
    exp_year: number;
  };
}

export class PaymentMethodId {
  @ApiProperty({
    description: 'PaymentMethodId',
  })
  @IsNotEmpty()
  paymentMethodId: string;
}

export class SubscriptionPlanId {
  @ApiProperty({
    description: 'SubscriptionPlanId',
  })
  @IsNotEmpty()
  subscriptionPlanId: string;
}
