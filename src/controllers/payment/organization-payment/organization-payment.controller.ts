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
    const subscriptionFeeInCents = subscriptionFee * 100;

    const priceObj = await this.stripeService.createProductWithPricing(
      orgId,
      subscriptionFeeInCents,
    );

    const response = await this.subscriptionPlanService.createSubscriptionPlan(
      orgId,
      subscriptionFeeInCents,
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

    const subscriptionFeeInCents = subscriptionFee * 100;

    const response = await this.subscriptionPlanService.getSubscriptionPlan();

    await this.stripeService.updatePrice(response.priceId, subscriptionFeeInCents);

    const updateResponse = await this.subscriptionPlanService.updateSubscriptionPlan(
      orgId,
      subscriptionFeeInCents,
      trialPeriod,
    );

    return {
      data: {
        subscriptionPlanId: updateResponse.id,
      },
    };
  }

  @Get('report')
  async generateReport(@User('orgId') orgId: string, @Res() res: Response) {
    const report = await this.subscriptionPlanService.generateReport(orgId);
    const data = await this.subscriptionPlanService.createTxtReport(report);
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="finance-report.txt"',
    });
    res.send(data);
  }
}
