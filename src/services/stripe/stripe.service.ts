import { Injectable } from '@nestjs/common';
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
}
