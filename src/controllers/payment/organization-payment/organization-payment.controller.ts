import { Body, Controller, Post, Put, Res } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { User } from 'src/common/decorators/user.decorator';
import { EventsService } from 'src/services/events/events.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import { SubscriptionPlanService } from 'src/services/subscription-plan/subscription-plan.service';
import { GenerateReportBody, SubscriptionPlanBody } from './organization-payment.dto';
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

  @Post('report')
  async generateReport(
    @User('orgId') orgId: string,
    @Body() body: GenerateReportBody,
    @Res() res: Response,
  ) {
    const { startDate, endDate } = body;

    const report = await this.subscriptionPlanService.generateReport(orgId, startDate, endDate);
    const { formattedOverview, ...txtReport } = report;
    const data = await this.subscriptionPlanService.createTxtReport(txtReport);

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="finance-report.txt"',
    });
    res.send(data);
    // res.download(excelFilePath, `subscription-plan-report.xlsx`, (err) => {
    //   if (err) {
    //     throw new HttpException(
    //       'Error while downloading the report: ' + JSON.stringify(err),
    //       HttpStatus.INTERNAL_SERVER_ERROR,
    //     );
    //   }

    //   // file to be deleted after the transfer is complete.
    //   unlink(excelFilePath, () => {
    //     console.log('File deleted successfully');
    //   });
    // });
  }
}
