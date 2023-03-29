import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { EventsService } from 'src/services/events/events.service';
import { NovuService } from 'src/services/novu/novu.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import { SubscriptionService } from 'src/services/subscription/subscription.service';
import { SubscriptionStatusEnum } from 'src/types/enum';
import Stripe from 'stripe';
import {
  GetBillingHistoryDTO,
  PaymentMethodId,
  UpdatePaymentMethodDTO,
} from './patient-payment.dto';

@Controller('patient-payment')
export class PatientPaymentController {
  constructor(
    private stripeService: StripeService,
    private subsciptionService: SubscriptionService,
    private eventsService: EventsService,
    private configService: ConfigService,
    private novuService: NovuService,
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

  @ApiBearerAuth('access-token')
  @UseInterceptors(new TransformResponseInterceptor())
  @Get('subscription-status')
  async getSubscriptionStatus(@User('id') userId: string, @User('orgId') orgId: string) {
    const { subscriptionId, customerId, createdAt } =
      await this.subsciptionService.getPatientDetails(userId);

    const customer = await this.stripeService.stripeClient.customers.retrieve(customerId);
    const trialExpired = await this.subsciptionService.isTrialExpired(orgId, createdAt);
    const paymentMethodAdded = !!subscriptionId;

    // archived
    if (!customerId) {
      return SubscriptionStatusEnum.ARCHIVED;
    }

    // blocked - not implemented yet
    if (customer.deleted) {
      return SubscriptionStatusEnum.BLOCKED;
    }

    // trial expired
    if (trialExpired) {
      if (!paymentMethodAdded) {
        return SubscriptionStatusEnum.TRIAL_EXPIRED;
      }
    }

    // if subscription hasn't started and user is trialing
    if (!subscriptionId) {
      return SubscriptionStatusEnum.TRIAL_PERIOD;
    }

    // active, cancelled or unpaid
    const { status } = await this.stripeService.stripeClient.subscriptions.retrieve(subscriptionId);

    if (status === 'trialing') {
      return SubscriptionStatusEnum.TRIAL_PERIOD;
    }

    if (
      status === 'unpaid' ||
      status === 'past_due' ||
      status === 'incomplete' ||
      status === 'incomplete_expired'
    ) {
      if (!paymentMethodAdded) {
        return SubscriptionStatusEnum.TRIAL_EXPIRED;
      }
      return SubscriptionStatusEnum.PAYMENT_PENDING;
    }

    return status;
  }

  @ApiBearerAuth('access-token')
  @Post('pause-subscription')
  async pauseSubscription(@User('id') userId: string, @Body() body: { resumesAt: string }) {
    const { resumesAt } = body;
    const { customerId, subscriptionId } = await this.subsciptionService.getPatientDetails(userId);
    if (!customerId) {
      throw new HttpException('CustomerId Not Found', HttpStatus.BAD_REQUEST);
    }
    if (!subscriptionId) {
      throw new HttpException('SubscriptionId Not Found', HttpStatus.BAD_REQUEST);
    }
    const subscription = await this.stripeService.stripeClient.subscriptions.update(
      subscriptionId,
      {
        pause_collection: {
          behavior: 'void',
          // stripe will take seconds instead of milliseconds
          resumes_at: new Date(resumesAt).getTime() / 1000,
        },
      },
    );

    // setting the status to paused
    await this.subsciptionService.setSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.PAUSED,
    );

    return subscription;
  }

  @ApiBearerAuth('access-token')
  @Post('resume-subscription-manually')
  async resumeSubscription(@User('id') userId: string) {
    const { customerId, subscriptionId } = await this.subsciptionService.getPatientDetails(userId);
    if (!customerId) {
      throw new HttpException('CustomerId Not Found', HttpStatus.BAD_REQUEST);
    }
    if (!subscriptionId) {
      throw new HttpException('SubscriptionId Not Found', HttpStatus.BAD_REQUEST);
    }

    const subscription = await this.stripeService.stripeClient.subscriptions.update(
      subscriptionId,
      {
        pause_collection: '',
      },
    );

    // setting the status to active
    await this.subsciptionService.setSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.ACTIVE,
    );

    return subscription;
  }

  @Get('generate-promo-code')
  async generatePromoCode(@Body() body: { coupon: string }): Promise<{
    promoCode: Stripe.PromotionCode;
  }> {
    const { coupon } = body;
    const promoCode = await this.stripeService.stripeClient.promotionCodes.create({
      coupon,
    });

    return {
      promoCode,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('create-subscription-with-promocode')
  async createSubscriptionWithPromoCode(
    @User('id') userId: string,
    @User('orgId') orgId: string,
    @Body() body: { promoCode: string },
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { promoCode } = body;
    const { customerId, subscriptionId } = await this.subsciptionService.getPatientDetails(userId);

    if (!customerId)
      throw new HttpException('Stripe customer not created.', HttpStatus.BAD_REQUEST);

    const isSubscriptionValid = await this.stripeService.verifySubscription(subscriptionId);
    if (isSubscriptionValid)
      throw new HttpException('Subscription already exists.', HttpStatus.BAD_REQUEST);

    const promoCodes = await this.stripeService.stripeClient.promotionCodes.list();
    let promoCodesList = promoCodes.data.map((promoCodeData: Stripe.PromotionCode) => ({
      code: promoCodeData.code,
      id: promoCodeData.id,
      active: promoCodeData.active,
    }));
    promoCodesList = promoCodesList.filter(
      (code: { code: string; id: string; active: boolean }) => code.active,
    );

    if (
      !promoCodesList.filter(
        (code: { code: string; id: string; active: boolean }) => code.code === promoCode,
      ).length
    )
      throw new HttpException('Invalid Promotion Code.', HttpStatus.BAD_REQUEST);

    const { subscription_plans } = await this.subsciptionService.getSubscriptionPlan(orgId);
    const { priceId, id: subscriptionPlanId } = subscription_plans[0];

    const subscriptionPlan: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      // adding promoCode to the subscription plan
      promotion_code: promoCodesList.filter(
        (code: { code: string; id: string }) => code.code === promoCode,
      )[0].id,
    };

    const subscription = await this.stripeService.stripeClient.subscriptions.create(
      subscriptionPlan,
    );
    const startDate = new Date(subscription.created * 1000);
    const endDate = new Date(subscription.current_period_end * 1000);

    // setting subscription details in patient and subscription tables
    await this.subsciptionService.setSubscription(
      userId,
      subscriptionPlanId,
      subscription.id,
      SubscriptionStatusEnum.ACTIVE,
      startDate.toISOString(),
      endDate.toISOString(),
    );

    await this.subsciptionService.setSubscriptionId(userId, subscription.id);

    return {
      subscription,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('create-subscription')
  async createSubscription(
    @User('id') userId: string,
    @User('orgId') orgId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { customerId, createdAt, subscriptionId } =
      await this.subsciptionService.getPatientDetails(userId);

    const isSubscriptionValid = await this.stripeService.verifySubscription(subscriptionId);
    if (isSubscriptionValid) {
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

      const startDate = new Date(subscription.created * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);

      // setting the subscription data in subscription table
      const subscriptionStatus = trialExpired
        ? SubscriptionStatusEnum.ACTIVE
        : SubscriptionStatusEnum.TRIAL_PERIOD;
      await this.subsciptionService.setSubscription(
        userId,
        subscriptionPlanId,
        subscription.id,
        subscriptionStatus,
        startDate.toISOString(),
        endDate.toISOString(),
      );
      // setting subscription data in patient table
      await this.subsciptionService.setSubscriptionId(userId, subscription.id);

      return {
        subscription,
      };
    } catch (err) {
      throw new HttpException(
        'Unable to create subscription::' + JSON.stringify(err),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiBearerAuth('access-token')
  @UseInterceptors(new TransformResponseInterceptor())
  @Get('get-default-paymentmethod')
  async getDefaultPaymentMethod(@User('id') userId: string) {
    const { customerId } = await this.subsciptionService.getPatientDetails(userId);
    const customer: any = await this.stripeService.stripeClient.customers.retrieve(customerId);
    const defaultPaymentMethodId: string = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethodId) {
      throw new HttpException('No default payment method found', HttpStatus.BAD_REQUEST);
    }

    const paymentMethod = await this.stripeService.stripeClient.paymentMethods.retrieve(
      defaultPaymentMethodId,
    );
    return paymentMethod;
  }

  @ApiBearerAuth('access-token')
  @Post('cancel-subscription')
  async cancelSubscription(
    @User('id') userId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { subscriptionId, email, nickname } = await this.subsciptionService.getPatientDetails(
      userId,
    );
    await this.eventsService.sendCancellationEmail(email, nickname);
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

    if (!subscriptionId) {
      throw new HttpException('Unable to get SubscriptionId', HttpStatus.BAD_REQUEST);
    }
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

  @Post('require-payment-action')
  async requirePaymentAction(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<any> {
    try {
      const event = this.stripeService.stripeClient.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET'),
      );
      if (event.type == 'payment_intent.requires_action') {
        const paymentIntent = event.data.object as any;
        const subscriptionId = await this.subsciptionService.getSubscriptionId(
          paymentIntent.customer as string,
        );
        if (paymentIntent.next_action?.use_stripe_sdk?.stripe_js) {
          await this.subsciptionService.setPaymentAuthUrl(
            subscriptionId,
            paymentIntent.next_action.use_stripe_sdk.stripe_js,
          );
        }

        return {
          status: 'success',
        };
      } else if (event.type == 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as any;
        const subscriptionId = await this.subsciptionService.getSubscriptionId(
          paymentIntent.customer as string,
        );
        await this.subsciptionService.setPaymentAuthUrl(subscriptionId, '');

        // updating the subscription end date
        const subscription = await this.stripeService.stripeClient.subscriptions.retrieve(
          subscriptionId,
        );
        const endDate = new Date(subscription.current_period_end * 1000).toISOString();
        await this.subsciptionService.setSubscriptionEndDate(subscriptionId, endDate);

        const patientId = await this.subsciptionService.getPatientId(subscriptionId);
        await this.novuService.novuClient.subscribers.update(patientId, {
          data: {
            paymentMade: true,
          },
        });

        return {
          status: 'success',
        };
      }
    } catch (err) {
      console.log(err);
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
