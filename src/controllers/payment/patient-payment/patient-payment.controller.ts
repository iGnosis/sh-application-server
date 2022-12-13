import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import Stripe from 'stripe';
import {
  AddPaymentMethodDTO,
  PaymentMethodId,
  UpdatePaymentMethodDTO,
} from './patient-payment.dto';

@Controller('patient-payment')
export class PatientPaymentController {
  constructor(private stripeService: StripeService, private gqlService: GqlService) {}

  @ApiBearerAuth('access-token')
  @Post('create-customer')
  async createCustomer(@User('id') userId: string): Promise<{ customerId: string }> {
    const query = `mutation SetCustomerId($id: uuid!, $customerId: String!) {
        update_patient_by_pk(pk_columns: {id: $id}, _set: {customerId: $customerId}) {
          customerId
        }
      }`;

    const { email } = await this.getPatientDetails(userId);

    const customer = await this.stripeService.stripeClient.customers.create({
      email,
    });

    await this.gqlService.client.request(query, {
      id: userId,
      customerId: customer.id,
    });

    return {
      customerId: customer.id,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('create-subscription')
  async createSubscription(
    @User('id') userId: string,
    @User('orgId') organizationId: string,
  ): Promise<{ subscriptionId: string }> {
    const getSubscriptionPlanQuery = `
      query GetSubscriptionPlan($org_id: uuid!) {
        subscription_plans(where: {organization: {_eq: $org_id}}) {
          priceId
          productId
          trialPeriod
          id
        }
      }
      `;

    const resp: { subscription_plans: { priceId: string; trialPeriod: number; id: string }[] } =
      await this.gqlService.client.request(getSubscriptionPlanQuery, {
        org_id: organizationId,
      });

    const { priceId, trialPeriod, id: subscriptionPlanId } = resp.subscription_plans[0];
    const { customerId, createdAt } = await this.getPatientDetails(userId);

    const subscriptionPlan: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
    };

    // to check if user is in trail
    const accountCreatedDate = new Date(createdAt);
    const accountPeriodInMS = accountCreatedDate.getTime() - new Date().getTime();
    const accountPeriodInDays = accountPeriodInMS / (1000 * 3600 * 24);

    let trailExpired = true;

    if (accountPeriodInDays < trialPeriod && accountPeriodInDays > 0) {
      // user will be charged at the end of trail_period
      subscriptionPlan.trial_period_days = accountPeriodInDays - trialPeriod;
      trailExpired = false;
    }

    try {
      const subscription = await this.stripeService.stripeClient.subscriptions.create(
        subscriptionPlan,
      );

      // setting the subscription data in subscription table
      if (trailExpired) {
        await this.setSubscription(subscriptionPlanId, subscription.id, 'active');
      } else {
        await this.setSubscription(subscriptionPlanId, subscription.id, 'trail_period');
      }

      // setting subscription data in patient table
      await this.setSubscriptionId(userId, subscription.id);

      return {
        subscriptionId: subscription.id,
      };
    } catch (err) {
      throw new HttpException('Unable to create subscription', HttpStatus.BAD_REQUEST);
    }
  }

  @ApiBearerAuth('access-token')
  @Post('cancel-subscription')
  async cancelSubscription(
    @User('id') userId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { subscriptionId } = await this.getPatientDetails(userId);
    const subscription = await this.stripeService.stripeClient.subscriptions.cancel(subscriptionId);
    return {
      subscription,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('get-subscription-details')
  async getSubscriptionDetails(
    @User('id') userId: string,
  ): Promise<{ subscription: Stripe.Subscription }> {
    const { subscriptionId } = await this.getPatientDetails(userId);
    const subscription = await this.stripeService.stripeClient.subscriptions.retrieve(
      subscriptionId,
    );
    return {
      subscription,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('add-payment-method')
  async addPaymentMethod(
    @User('id') userId: string,
    @Body() body: AddPaymentMethodDTO,
  ): Promise<{ paymentMethod: string }> {
    const { cardDetails } = body;
    const paymentMethod = await this.stripeService.stripeClient.paymentMethods.create({
      type: 'card',
      card: cardDetails,
    });

    const { customerId } = await this.getPatientDetails(userId);
    // attaching the paymentMethod to the customer
    await this.stripeService.stripeClient.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });
    //setting the paymentMethod as default paymentmethod for invoice/subscription payments.
    await this.stripeService.stripeClient.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    const query = `
      mutation SetPaymentMethod($customerId: String!, $paymentMethodId: String!) {
        insert_payment_methods_one(object: {customerId: $customerId, paymentMethodId: $paymentMethodId}) {
          id
        }
      }
      `;
    const setPaymentMethod = await this.gqlService.client.request(query, {
      customerId,
      paymentMethodId: paymentMethod.id,
    });
    return {
      paymentMethod: setPaymentMethod.insert_payment_methods_one.id,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('remove-payment-method')
  async removePaymentMethod(@Body() body: PaymentMethodId): Promise<{ status: string }> {
    const { paymentMethodId } = body;
    const paymentMethod = await this.stripeService.stripeClient.paymentMethods.detach(
      paymentMethodId,
    );
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

  async setSubscriptionId(userId: string, subscriptionId: string) {
    const query = `
        mutation SetSubscriptionId($id: uuid!, $subscription: String!) {
          update_patient_by_pk(pk_columns: {id: $id}, _set: {subscription: $subscription}) {
            subscription
          }
        }
        `;
    try {
      await this.gqlService.client.request(query, {
        id: userId,
        subscription: subscriptionId,
      });
    } catch (err) {
      console.log('Error::setSubscriptionId:', err);
    }
  }

  async setSubscription(
    subscriptionPlanId: string,
    subscriptionId: string,
    status: 'trail_period' | 'active',
  ) {
    const query = `
      mutation SetSubscription($subscriptionId: String!, $subscriptionPlanId: uuid!, $status: subscription_status_enum!) {
        insert_subscriptions_one(object: {status: $status, subscriptionId: $subscriptionId, subscriptionPlanId: $subscriptionPlanId}) {
          id
        }
      }`;

    await this.gqlService.client.request(query, {
      status,
      subscriptionId,
      subscriptionPlanId,
    });
  }

  async getPatientDetails(
    userId: string,
  ): Promise<{ subscriptionId: string; customerId: string; email: string; createdAt: string }> {
    const query = `
        query getPatientDetails($id: uuid!) {
          patient_by_pk(id: $id) {
            subscription
            customerId
            email
            createdAt
          }
        } `;

    try {
      const resp: {
        patient_by_pk: {
          subscription: string;
          customerId: string;
          email: string;
          createdAt: string;
        };
      } = await this.gqlService.client.request(query, {
        id: userId,
      });
      return {
        subscriptionId: resp.patient_by_pk.subscription,
        customerId: resp.patient_by_pk.customerId,
        email: resp.patient_by_pk.email,
        createdAt: resp.patient_by_pk.createdAt,
      };
    } catch (err) {
      console.log(err);
    }
  }
}
