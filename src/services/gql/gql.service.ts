import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLClient } from 'graphql-request';

@Injectable()
export class GqlService {
  public client;
  constructor(private config: ConfigService) {
    this.client = new GraphQLClient(this.config.get('GQL_API_ENDPOINT'), {
      headers: {
        'x-hasura-admin-secret': this.config.get('GQL_API_ADMIN_SECRET'),
      },
    });
  }
}
