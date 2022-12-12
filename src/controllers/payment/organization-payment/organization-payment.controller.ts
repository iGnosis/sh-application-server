import { Body, Controller, HttpException, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { StripeService } from 'src/services/stripe/stripe.service';
import { SubscriptionPlanService } from 'src/services/subscription-plan/subscription-plan.service';
import { SubscriptionPlanBody } from './organization-payment.dto';
@ApiBearerAuth('access-token')
@Controller('organization-payment')
export class OrganizationPaymentController {
  constructor(
    private stripeService: StripeService,
    private subscriptionPlanService: SubscriptionPlanService,
  ) {}

  @Post()
  async createSubscriptionPlan(@Body() body: SubscriptionPlanBody, @User('orgId') orgId: string) {
    const { subscriptionFee, trialPeriod } = body;

    const priceObj = await this.stripeService.createProductWithPricing(orgId, subscriptionFee);

    const response = await this.subscriptionPlanService.createSubscriptionPlan(
      orgId,
      subscriptionFee,
      trialPeriod,
      priceObj.product,
      priceObj.id,
    );

    return {
      data: {
        subscriptionPlanId: response.subscriptionPlanId,
      },
    };
  }

  @Put()
  async updateSubscriptionPlan(@Body() body: SubscriptionPlanBody, @User('orgId') orgId: string) {
    const { subscriptionFee, trialPeriod } = body;

    const response = await this.subscriptionPlanService.getSubscriptionPlan();

    await this.stripeService.updatePrice(response.priceId, subscriptionFee);

    const updateResponse = await this.subscriptionPlanService.updateSubscriptionPlan(
      orgId,
      subscriptionFee,
      trialPeriod,
    );

    return {
      data: {
        subscriptionPlanId: updateResponse.id,
      },
    };
  }
}
