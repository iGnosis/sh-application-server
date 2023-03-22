import { Injectable } from '@nestjs/common';
import { SubscriptionStatusEnum } from 'src/types/enum';
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

  async setPaymentAuthUrl(subscriptionId: string, paymentAuthUrl: string) {
    const query = `
    mutation SetPaymentAuthUrl($paymentAuthUrl: String = "", $subscriptionId: String = "") {
      update_subscriptions(where: {subscriptionId: {_eq: $subscriptionId}}, _set: {paymentAuthUrl: $paymentAuthUrl}) {
        affected_rows
      }
    }`;
    return this.gqlService.client.request(query, { subscriptionId, paymentAuthUrl });
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
    patient: string,
    subscriptionPlanId: string,
    subscriptionId: string,
    status: 'trial_period' | 'active',
    startDate: string,
    endDate: string,
  ) {
    const query = `mutation SetSubscription($subscriptionId: String!, $subscriptionPlanId: uuid!, $status: subscription_status_enum!, $startDate: timestamptz!, $endDate: timestamptz!, $patient: uuid!) {
      insert_subscriptions_one(object: {status: $status, subscriptionId: $subscriptionId, subscriptionPlanId: $subscriptionPlanId, startDate: $startDate, endDate: $endDate, patient: $patient}) {
        id
      }
    }`;

    return this.gqlService.client.request(query, {
      patient,
      status,
      subscriptionId,
      subscriptionPlanId,
      startDate,
      endDate,
    });
  }

  async setSubscriptionEndDate(subscriptionId: string, endDate: string) {
    const query = `
      mutation SetSubscriptionEndDate($subscriptionId: String!, $endDate: timestamptz!) {
        update_subscriptions(where: {subscriptionId: {_eq: $subscriptionId}}, _set: {endDate: $endDate}) {
          affected_rows
        }
      }`;

    return this.gqlService.client.request(query, {
      subscriptionId,
      endDate,
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

  async setSubscriptionStatus(subscriptionId: string, subscriptionStatus: SubscriptionStatusEnum) {
    const query = `mutation SetSubscriptionStatus($subscriptionStatus: subscription_status_enum = active, $subscriptionId: String!) {
      update_subscriptions(_set: {status: $subscriptionStatus}, where: {subscriptionId: {_eq: $subscriptionId}}) {
        affected_rows
      }
    }
    `;
    return this.gqlService.client.request(query, {
      subscriptionId,
      subscriptionStatus,
    });
  }

  async getSubscriptionId(customerId: string) {
    try {
      const query = `
      query getSubscriptionFromCustomer($customerId: String = "") {
        patient(where: {customerId: {_eq: $customerId}}) {
          subscription
        }
      }`;
      const resp = await this.gqlService.client.request(query, { customerId });
      return resp.patient[0].subscription;
    } catch (err) {
      console.log(err);
    }
  }

  async getPatientId(subscriptionId: string) {
    try {
      const query = `query GetPatientId($subscriptionId: String!) {
        patient(where: {subscription: {_eq: $subscriptionId}}) {
          id
        }
      }`;
      const resp = await this.gqlService.client.request(query, { subscriptionId });
      return resp.patient[0].id;
    } catch (err) {
      console.log(err);
    }
  }

  async getPatientDetails(userId: string): Promise<{
    subscriptionId: string;
    customerId: string;
    email: string;
    createdAt: string;
    nickname: string;
  }> {
    const query = `
        query getPatientDetails($id: uuid!) {
          patient_by_pk(id: $id) {
            subscription
            customerId
            email: pii_email(path: "value")
            nickname
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
          nickname: string;
        };
      } = await this.gqlService.client.request(query, {
        id: userId,
      });
      const {
        subscription: subscriptionId,
        customerId,
        email,
        createdAt,
        nickname,
      } = resp.patient_by_pk;
      return {
        subscriptionId,
        customerId,
        email,
        createdAt,
        nickname,
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
