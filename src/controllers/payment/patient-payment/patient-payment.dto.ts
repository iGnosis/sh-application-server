import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
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

export class GetBillingHistoryDTO {
  @ApiProperty({
    description: 'starting after object id',
  })
  @IsString()
  startingAfter: string;

  @ApiProperty({
    description: 'Ending before object id',
  })
  @IsString()
  endingBefore: string;

  @ApiProperty({
    description: 'limit of items per page',
  })
  @IsNumber()
  @IsNotEmpty()
  limit: number;
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
