import { Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';

@Injectable()
export class SubscriptionService {
  constructor(private gqlService: GqlService) {}

  async setCustomerId(id: string, customerId: string) {
    const query = `mutation SetCustomerId($id: uuid!, $customerId: String!) {
        update_patient_by_pk(pk_columns: {id: $id}, _set: {customerId: $customerId}) {
          customerId
        }
      }`;
    return this.gqlService.client.request(query, { id, customerId });
  }

  async getSubscriptionPlan(orgId: string) {
    const query = `
      query GetSubscriptionPlan($orgId: uuid!) {
        subscription_plans(where: {organization: {_eq: $orgId}}) {
          priceId
          productId
          trialPeriod
          id
        }
      }`;

    return this.gqlService.client.request<
      {
        subscription_plans: { priceId: string; trialPeriod: number; id: string }[];
      },
      { orgId: string }
    >(query, { orgId });
  }

  async removeSubscription(id: string, subscriptionId: string) {
    const query = `
      mutation RemoveSubscription($subscriptionId: String!, $id: uuid!) {
        update_patient_by_pk(pk_columns: {id: $id}, _set: {subscription: null}) {
          subscription
        }
        update_subscriptions(where: {subscriptionId: {_eq: $subscriptionId}}, _set: {status: cancelled}) {
          affected_rows
        }
      }`;

    return this.gqlService.client.request(query, { subscriptionId, id });
  }

  async setSubscription(
    subscriptionPlanId: string,
    subscriptionId: string,
    status: 'trial_period' | 'active',
  ) {
    const query = `
      mutation SetSubscription($subscriptionId: String!, $subscriptionPlanId: uuid!, $status: subscription_status_enum!) {
        insert_subscriptions_one(object: {status: $status, subscriptionId: $subscriptionId, subscriptionPlanId: $subscriptionPlanId}) {
          id
        }
      }`;

    return this.gqlService.client.request(query, {
      status,
      subscriptionId,
      subscriptionPlanId,
    });
  }

  async setSubscriptionId(userId: string, subscriptionId: string) {
    const query = `
        mutation SetSubscriptionId($id: uuid!, $subscription: String!) {
          update_patient_by_pk(pk_columns: {id: $id}, _set: {subscription: $subscription}) {
            subscription
          }
        }`;

    return this.gqlService.client.request(query, {
      id: userId,
      subscription: subscriptionId,
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
      const { subscription: subscriptionId, customerId, email, createdAt } = resp.patient_by_pk;
      return {
        subscriptionId,
        customerId,
        email,
        createdAt,
      };
    } catch (err) {
      console.log(err);
    }
  }

  async isTrialExpired(orgId: string, createdAt: string) {
    const { subscription_plans } = await this.getSubscriptionPlan(orgId);
    const { trialPeriod } = subscription_plans[0];
    const accountCreatedTimeStamp = Math.ceil(new Date(createdAt).getTime() / 1000);
    const trialPeriodInSeconds = trialPeriod * 24 * 3600;
    const currentTimeStamp = Math.ceil(new Date().getTime() / 1000);
    return currentTimeStamp > accountCreatedTimeStamp + trialPeriodInSeconds;
  }
}
