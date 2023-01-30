import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
// import { Workbook, Worksheet } from 'exceljs';
// import * as tmp from 'tmp';

@Injectable()
export class SubscriptionPlanService {
  constructor(private gqlService: GqlService, private stripeService: StripeService) {}

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

  private getSubscriptionsForPatient(subscriptions: Stripe.Subscription[], patients: any[]) {
    const hashTable = {};
    for (const subscription of subscriptions) {
      hashTable[subscription.id] = subscription;
    }

    const matchingValues = patients.filter((patient: any) => hashTable[patient.subscription]);

    return matchingValues.map((patient: any) => {
      return {
        name: patient.nickname || patient.id,
        billingStart: new Date(hashTable[patient.subscription].current_period_start * 1000),
        billingEnd: new Date(hashTable[patient.subscription].current_period_end * 1000),
      };
    });
  }

  private isPatientTrialing(createdAt: string, trialPeriod: number) {
    const accountCreatedTimeStamp = Math.ceil(new Date(createdAt).getTime() / 1000);
    const trialPeriodInSeconds = trialPeriod * 24 * 3600;
    const currentTimeStamp = Math.ceil(new Date().getTime() / 1000);
    return currentTimeStamp < accountCreatedTimeStamp + trialPeriodInSeconds;
  }

  async generateReport(organizationId: string, startDate: string, endDate: string) {
    try {
      const query = `
      query PatientDetails($orgId: uuid!) {
        organization_by_pk(id: $orgId) {
          patients {
            id
            subscription
            nickname
            createdAt
          }
        }
        subscription_plans(where: {organization: {_eq: $orgId}}) {
          priceId
          trialPeriod
          id
        }
      }
      `;
      const resp = await this.gqlService.client.request(query, {
        orgId: organizationId,
      });

      if (!resp || !resp.organization_by_pk) {
        throw new HttpException('Error while generating report', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const { subscription_plans } = resp;
      const { patients } = resp.organization_by_pk;
      if (subscription_plans.length === 0) return;
      const subscriptions = await this.stripeService.getSubscriptionsForPrice(
        subscription_plans[0].priceId,
      );

      let totalRevenue = 0;
      let currency = '';

      for (const subscription of subscriptions) {
        if (subscription.status === 'active') {
          const invoices = await this.stripeService.getInvoicesForSubscription(
            subscription.id,
            startDate,
            endDate,
          );
          totalRevenue += invoices.reduce((acc, invoice) => {
            currency = invoice.currency || currency;
            return acc + invoice.amount_paid / 100;
          }, 0);
        }
      }

      const revenue = (currency || '$') + ' ' + totalRevenue;
      const royalty = (currency || '$') + ' ' + totalRevenue * 0.3;
      const grossProfit = (currency || '$') + ' ' + totalRevenue * 0.7;
      const trialingPatientsCount =
        patients.filter(
          (patient) =>
            !patient.subscription &&
            this.isPatientTrialing(patient.createdAt, subscription_plans[0].trialPeriod),
        ).length +
        subscriptions.filter((subscription) => subscription.status === 'trialing').length;

      const overview = [];
      overview.push([
        'Total Paying Users',
        'Total Patients on Trial',
        'Total Revenue',
        'Royalty',
        'Gross Profit',
      ]);
      overview.push([
        subscriptions.filter((subscription) => subscription.status === 'active').length,
        trialingPatientsCount,
        revenue,
        royalty,
        grossProfit,
      ]);

      let formattedOverview = '';
      overview[0].forEach((header, i) => {
        formattedOverview += `${header} = ${overview[1][i]}\n`;
      });
      // const patientsWithBillingCycle = this.getSubscriptionsForPatient(subscriptions, patients);

      // const billingCycle = [];
      // billingCycle.push(['Patient Name', 'Billing Start', 'Billing End']);
      // for (const patient of patientsWithBillingCycle) {
      //   billingCycle.push([patient.name, patient.billingStart, patient.billingEnd]);
      // }

      const results = {
        overview,
        // billingCycle,
        formattedOverview,
      };

      return results;
    } catch (err) {
      throw new HttpException(
        'Error while generating report: ' + JSON.stringify(err),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTxtReport(reportMetrics: { [key: string]: any }) {
    let data = '';
    for (const [_, value] of Object.entries(reportMetrics)) {
      data += value.map((row) => row.join(',')).join('\n');
      data += '\n\n';
    }

    return data;
  }

  async saveMonthlyReport(revenue: number, organization: string) {
    try {
      const query = `
      mutation SaveMonthlyReport($revenue: Int = 0, $organization: uuid!) {
        insert_billing_history_one(object: {revenue: $revenue, organization: $organization}) {
          revenue
        }
      }`;
      const resp = await this.gqlService.client.request(query, {
        revenue,
        organization,
      });

      return resp;
    } catch (err) {
      return err;
    }
  }
}
// async createExcelReport(reportMetrics: { [key: string]: any[] }) {
//   const workbook = new Workbook();
//   const sheet = workbook.addWorksheet('Subscription Plan Report');

//   for (const [_, value] of Object.entries(reportMetrics)) {
//     value.forEach((val) => {
//       sheet.addRow(val);
//     });
//     // add extra 2 rows for spacing.
//     sheet.addRows([[], []]);
//   }

//   this.styleSheet(sheet);

//   const excelFile: string = await new Promise((resolve, reject) => {
//     tmp.file(
//       {
//         discardDescriptor: true,
//         prefix: 'MyExcelSheet',
//         postfix: '.xlsx',
//         mode: parseInt('0600', 8),
//       },
//       async (err: any, file: any) => {
//         if (err) {
//           throw new HttpException(
//             'Internal server error: ' + JSON.stringify(err),
//             HttpStatus.INTERNAL_SERVER_ERROR,
//           );
//         }
//         workbook.xlsx
//           .writeFile(file)
//           .then((_) => {
//             resolve(file);
//           })
//           .catch((err) => {
//             throw new HttpException(
//               'Internal server error: ' + JSON.stringify(err),
//               HttpStatus.INTERNAL_SERVER_ERROR,
//             );
//           });
//       },
//     );
//   });
//   return excelFile;
// }

// private styleSheet(sheet: Worksheet) {
//   sheet.getColumn(1).width = 16;
//   sheet.getColumn(2).width = 22;
//   sheet.getColumn(3).width = 20;
//   sheet.getColumn(4).width = 22;
//   sheet.getColumn(5).width = 14;
// }
