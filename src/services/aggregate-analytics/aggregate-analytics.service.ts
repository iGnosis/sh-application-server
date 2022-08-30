import { Injectable } from '@nestjs/common';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class AggregateAnalyticsService {
  constructor(private gqlService: GqlService) {}

  // TODO:
  // Implement methods to aggregate achievement ratio and completion time.

  async updateAggreateAnalytics(gameId: string, data: object) {
    const query = `mutation UpdateAggregateAnalytics($gameId: uuid!, $aggregateAnalytics: jsonb!) {
      update_game_by_pk(pk_columns: {id: $gameId}, _append: {aggregateAnalytics: $aggregateAnalytics}) {
        id
      }
    }`;
    await this.gqlService.client.request(query);
  }
}
