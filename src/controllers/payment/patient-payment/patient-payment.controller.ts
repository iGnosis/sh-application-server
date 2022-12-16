import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { StripeService } from 'src/services/stripe/stripe.service';
import { SubscriptionService } from 'src/services/subscription/subscription.service';
import { SubscriptionStatus } from 'src/types/global';
import Stripe from 'stripe';
import {
  PaymentMethodId,
  UpdatePaymentMethodDTO,
  GetBillingHistoryDTO,
} from './patient-payment.dto';

@Controller('patient-payment')
export class PatientPaymentController {
  constructor(
    private stripeService: StripeService,
    private subsciptionService: SubscriptionService,
  ) {}

  @ApiBearerAuth('access-token')
  @Post('create-customer')
  async createCustomer(@User('id') userId: string): Promise<{ customerId: string }> {
    const { email } = await this.subsciptionService.getPatientDetails(userId);

    if (!email) {
      throw new HttpException('User Email Not Found', HttpStatus.BAD_REQUEST);
    }
    const { id: customerId } = await this.stripeService.stripeClient.customers.create({
      email,
    });
    await this.subsciptionService.setCustomerId(userId, customerId);
    return {
      customerId,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('create-setup-intent')
  async createSetupIntent(@User('id') userId: string): Promise<{ clientSecret: string }> {
    const { customerId } = await this.subsciptionService.getPatientDetails(userId);
    if (!customerId) {
      throw new HttpException('CustomerId Not Found', HttpStatus.BAD_REQUEST);
    }
    const { client_secret } = await this.stripeService.stripeClient.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return {
      clientSecret: client_secret,
    };
  }

  // WIP
  @ApiBearerAuth('access-token')
  @Post('subscription-status')
  async getSubscriptionStatus(@User('id') userId: string): Promise<SubscriptionStatus> {
    const { subscriptionId, customerId } = await this.subsciptionService.getPatientDetails(userId);
    if (!subscriptionId) {
      return 'canceled';
    }
    const { status } = await this.stripeService.stripeClient.subscriptions.retrieve(subscriptionId);
    // the subscription is in trailing period
    if (status === 'trialing') {
      return 'trial_period';
    }
    if (
      status === 'unpaid' ||
      status === 'past_due' ||
      status === 'incomplete' ||
      status === 'incomplete_expired'
    ) {
      return 'payment_pending';
    }

    return status;
  }

  @ApiBearerAuth('access-token')
  @Post('create-subscription')
  async createSubscription(
    @User('id') userId: string,
    @User('orgId') orgId: string,
  ): Promise<{ subscriptionId: string }> {
    const { customerId, createdAt, subscriptionId } =
      await this.subsciptionService.getPatientDetails(userId);

    if (subscriptionId) {
      throw new HttpException('Subscription already exists', HttpStatus.BAD_REQUEST);
    }

    const { subscription_plans } = await this.subsciptionService.getSubscriptionPlan(orgId);
    const { priceId, trialPeriod, id: subscriptionPlanId } = subscription_plans[0];

    const subscriptionPlan: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
    };

    const accountCreatedTimeStamp = Math.ceil(new Date(createdAt).getTime() / 1000);
    const trialPeriodInSeconds = trialPeriod * 24 * 3600;
    const trialEnd = accountCreatedTimeStamp + trialPeriodInSeconds;

    let trialExpired = true;
    const currentTimeStamp = Math.ceil(new Date().getTime() / 1000);

    if (currentTimeStamp < trialEnd) {
      subscriptionPlan.trial_end = trialEnd;
      trialExpired = false;
    }

    try {
      const subscription = await this.stripeService.stripeClient.subscriptions.create(
        subscriptionPlan,
      );

      // setting the subscription data in subscription table
      const subscriptionStatus = trialExpired ? 'active' : 'trial_period';
      await this.subsciptionService.setSubscription(
        subscriptionPlanId,
        subscription.id,
        subscriptionStatus,
      );
      // setting subscription data in patient table
      await this.subsciptionService.setSubscriptionId(userId, subscription.id);

      return {
        subscriptionId: subscription.id,
      };
    } catch (err) {
      console.log(err);
      throw new HttpException('Unable to create subscription', HttpStatus.BAD_REQUEST);
    }
  }

  @ApiBearerAuth('access-token')
  @Post('cancel-subscription')
  async cancelSubscription(
    @User('id') userId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { subscriptionId } = await this.subsciptionService.getPatientDetails(userId);
    const subscription = await this.stripeService.stripeClient.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      },
    );
    await this.subsciptionService.removeSubscription(userId, subscriptionId);
    return {
      subscription,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('get-subscription-details')
  async getSubscriptionDetails(
    @User('id') userId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { subscriptionId } = await this.subsciptionService.getPatientDetails(userId);
    const subscription = await this.stripeService.stripeClient.subscriptions.retrieve(
      subscriptionId,
    );
    return {
      subscription,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('set-default-paymentmethod')
  async setDefaultPaymentMethod(
    @User('id') userId: string,
    @Body() body: PaymentMethodId,
  ): Promise<{ data: Stripe.Customer }> {
    const { paymentMethodId } = body;
    const { customerId } = await this.subsciptionService.getPatientDetails(userId);
    //setting the paymentMethod as default paymentmethod which will be used for invoice/subscription payments.
    const customer = await this.stripeService.stripeClient.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    return {
      data: customer,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('remove-payment-method')
  async removePaymentMethod(@Body() body: PaymentMethodId): Promise<{ status: string }> {
    const { paymentMethodId } = body;
    await this.stripeService.stripeClient.paymentMethods.detach(paymentMethodId);
    return {
      status: 'success',
    };
  }

  @ApiBearerAuth('access-token')
  @Post('get-paymentmethod-details')
  async getPaymentMethodDetails(
    @Body() body: PaymentMethodId,
  ): Promise<{ data: Stripe.PaymentMethod }> {
    const { paymentMethodId } = body;
    const paymentMethod = await this.stripeService.stripeClient.paymentMethods.retrieve(
      paymentMethodId,
    );
    return {
      data: paymentMethod,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('update-paymentmethod-details')
  async updatePaymentMethodDetails(
    @Body() body: UpdatePaymentMethodDTO,
  ): Promise<{ data: Stripe.PaymentMethod }> {
    const { cardDetails, paymentMethodId } = body;
    console.log(body);
    // you can only update card expiry month and year but not the number.
    const paymentMethod = await this.stripeService.stripeClient.paymentMethods.update(
      paymentMethodId,
      {
        card: {
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year,
        },
      },
    );
    return {
      data: paymentMethod,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('get-billing-history')
  async getBillingHistory(
    @User('id') userId: string,
    @Body() body: GetBillingHistoryDTO,
  ): Promise<any> {
    try {
      const { endingBefore, startingAfter, limit } = body;
      const { customerId } = await this.subsciptionService.getPatientDetails(userId);

      if (!customerId) throw new HttpException('No customer', HttpStatus.NOT_IMPLEMENTED);

      const invoices = await this.stripeService.stripeClient.invoices.list({
        customer: customerId,
        limit: limit,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        ...(endingBefore ? { ending_before: endingBefore } : {}),
        status: 'paid',
      });

      const response = [];

      for (const invoice of invoices.data) {
        const rowData = {
          id: invoice.id,
          paymentDate: invoice.status_transitions.paid_at,
          subscriptionPeriod: {
            start: invoice.lines.data[0].period.start,
            end: invoice.lines.data[0].period.end,
          },
          cardDetails: {},
          amountPaid: invoice.amount_paid / 100,
          url: invoice.hosted_invoice_url,
        };

        const fullInvoice = await this.stripeService.stripeClient.invoices.retrieve(invoice.id, {
          expand: ['payment_intent'],
        });

        if (!fullInvoice || !fullInvoice.payment_intent) {
          response.push(rowData);
          continue;
        }

        const paymentMethodId = (fullInvoice.payment_intent as Stripe.PaymentIntent).payment_method;

        if (paymentMethodId) {
          const cardDetails = await this.stripeService.stripeClient.paymentMethods.retrieve(
            paymentMethodId as string,
          );
          if (!cardDetails || !cardDetails.card)
            throw new HttpException('No card details', HttpStatus.NOT_FOUND);
          else {
            rowData['cardDetails'] = {
              last4: cardDetails.card.last4,
              brand: cardDetails.card.brand,
            };
          }
        } else {
          throw new HttpException('No payment method', HttpStatus.NOT_FOUND);
        }

        response.push(rowData);
      }

      return {
        invoices: response,
        hasMore: invoices.has_more,
      };
    } catch (err) {
      console.log(err);
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
