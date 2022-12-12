import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionPlanService {
  constructor(private gqlService: GqlService) {}

  async createSubscriptionPlan(
    organizationId: string,
    subscriptionFee: number,
    trialPeriod: number,
    productId: string | Stripe.Product | Stripe.DeletedProduct,
    priceId: string,
  ) {
    const query = `
    mutation CreateSubscriptionPlan($subscriptionFee: Int!, $trialPeriod: Int = 30, $productId: String!, $priceId: String!, $organization: uuid!) {
      insert_subscription_plans_one(object: {subscriptionFee: $subscriptionFee, trialPeriod: $trialPeriod, productId: $productId, priceId: $priceId, organization: $organization}) {
        id
      }
    }`;
    const resp = await this.gqlService.client.request(query, {
      subscriptionFee,
      trialPeriod,
      productId,
      priceId,
      organization: organizationId,
    });

    if (!resp || !resp.insert_subscription_plans_one) {
      throw new HttpException(
        'Error while creating subscription plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const updateOrgQuery = `
    mutation UpdateOrganizationSubscriptionPlan($id: uuid!, $subscriptionPlan: uuid!) {
      update_organization_by_pk(pk_columns: {id: $id}, _set: {subscriptionPlan: $subscriptionPlan}) {
        id
      }
    }`;
    const updateResponse = await this.gqlService.client.request(updateOrgQuery, {
      id: organizationId,
      subscriptionPlan: resp.insert_subscription_plans_one.id,
    });

    if (!updateResponse || !updateResponse.update_organization_by_pk) {
      throw new HttpException(
        'Error while updating subscription plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      subscriptionPlanId: resp.insert_subscription_plans_one.id,
    };
  }

  async getSubscriptionPlan() {
    const query = `
      query GetSubscriptionPlan {
        subscription_plans {
          priceId
        }
      }`;
    const resp = await this.gqlService.client.request(query);

    if (!resp || !resp.subscription_plans || resp.subscription_plans.length === 0) {
      throw new HttpException(
        'No subscription plans found for your organization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return resp.subscription_plans[0];
  }

  async updateSubscriptionPlan(organization: string, subscriptionFee: number, trialPeriod: number) {
    const query = `
    mutation UpdateSubscriptionPlan($organization: uuid!, $subscriptionFee: Int!, $trialPeriod: Int!) {
      update_subscription_plans(where: {organization: {_eq: $organization}}, _set: {subscriptionFee: $subscriptionFee, trialPeriod: $trialPeriod}) {
        returning {
          id
        }
      }
    }`;
    const resp = await this.gqlService.client.request(query, {
      organization,
      subscriptionFee,
      trialPeriod,
    });

    if (
      !resp ||
      !resp.update_subscription_plans ||
      resp.update_subscription_plans.returning.length === 0
    ) {
      throw new HttpException(
        'Error while updating subscription plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      id: resp.update_subscription_plans.returning[0].id,
    };
  }
}
