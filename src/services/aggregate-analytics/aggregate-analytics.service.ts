import { Injectable } from '@nestjs/common';
import { AnalyticsDTO } from 'src/types/analytics';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class AggregateAnalyticsService {
  constructor(private gqlService: GqlService) {}

  // TODO: @Deep
  // Implement methods to aggregate achievement ratio and completion time.

  averageAchievementRatio(analytics: AnalyticsDTO[]) {
    const correctPromptsCount = analytics.reduce((count, data) => {
      if (data.result.type === 'success') {
        count++;
      }
      return count;
    }, 0);
    const avgAchievementRatio = parseFloat((correctPromptsCount / analytics.length).toFixed(2));
    return avgAchievementRatio;
  }

  averageCompletionRatio(analytics: AnalyticsDTO[]) {
    const sumCompletionTime = analytics.reduce((sum, val) => {
      if (val.reaction.completionTime) {
        sum += val.reaction.completionTime;
      }
      return sum;
    }, 0);

    const countCompletionTimePrompts = analytics.reduce((count, val) => {
      if (val.reaction.completionTime) {
        count++;
      }
      return count;
    }, 0);

    return {
      avgInSec: parseFloat((sumCompletionTime / countCompletionTimePrompts).toFixed(2)),
      noOfPromptsConsidered: countCompletionTimePrompts,
    };
  }

  async updateAggregateAnalytics(gameId: string, data: object) {
    const query = `mutation UpdateAggregateAnalytics($gameId: uuid!, $aggregateAnalytics: jsonb!) {
      update_game_by_pk(pk_columns: {id: $gameId}, _append: {aggregateAnalytics: $aggregateAnalytics}) {
        id
      }
    }`;
    await this.gqlService.client.request(query, { gameId, aggregateAnalytics: data });
  }
}
