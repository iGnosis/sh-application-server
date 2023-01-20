import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  stripeClient!: Stripe;
  constructor(private configService: ConfigService) {
    this.stripeClient = new Stripe(this.configService.get('STRIPE_TEST_KEY'), {
      apiVersion: '2022-11-15',
    });
  }

  async createProductWithPricing(name: string, price: number): Promise<Stripe.Price> {
    try {
      const response: Stripe.Product = await this.stripeClient.products.create({
        name,
      });
      return this.createPriceForProduct(response.id, price);
    } catch (err: any) {
      throw new HttpException(
        'Unable to create product for the organization subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  createPriceForProduct(productId: string, price: number): Promise<Stripe.Price> {
    try {
      return this.stripeClient.prices.create({
        unit_amount: price,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        product: productId,
      });
    } catch (err: any) {
      throw new HttpException(
        'Unable to create the price for organization subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePrice(priceId: string, price: number): Promise<Stripe.Price> {
    try {
      const response = await this.stripeClient.prices.update(priceId, {
        active: false,
      });

      return this.createPriceForProduct(response.product as string, price);
    } catch (err: any) {
      throw new HttpException(
        'Unable to update the subscription fee',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSubscriptionsForPrice(priceId: string): Promise<Stripe.Subscription[]> {
    try {
      const response = await this.stripeClient.subscriptions.list({
        price: priceId,
      });

      return response.data;
    } catch (err: any) {
      return err;
    }
  }

  async getInvoicesForSubscription(
    subscriptionId: string,
    startDate: string,
    endDate: string,
  ): Promise<Stripe.Invoice[]> {
    try {
      const response = await this.stripeClient.invoices.list({
        subscription: subscriptionId,
        status: 'paid',
        created: {
          gte: Math.floor(new Date(startDate).getTime() / 1000),
          lt: Math.floor(new Date(endDate).getTime() / 1000),
        },
      });

      return response.data;
    } catch (err: any) {
      throw new HttpException(
        'Unable to get invoices for the price: ' + err.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
