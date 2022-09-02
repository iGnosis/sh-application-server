import { Injectable } from '@nestjs/common';
import { AggregatedObject, AnalyticsDTO } from 'src/types/analytics';
import { GqlService } from '../gql/gql.service';

@Injectable()
export class AggregateAnalyticsService {
  constructor(private gqlService: GqlService) {}

  averageAchievementRatio(analytics: AnalyticsDTO[]) {
    const correctPromptsCount = analytics.reduce((count, data) => {
      if (data.result.type === 'success') {
        count++;
      }
      return count;
    }, 0);

    // key, value & noOfSamples are required to store in aggregate_analytics table.
    return {
      key: 'avgAchievementRatio',
      value: parseFloat((correctPromptsCount / analytics.length).toFixed(2)),
      noOfSamples: analytics.length,
    };
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

    // key, value & noOfSamples are required to store in aggregate_analytics table.
    return {
      key: 'avgCompletionTime',
      value: parseFloat((sumCompletionTime / countCompletionTimePrompts).toFixed(2)),
      noOfSamples: countCompletionTimePrompts,
    };
  }

  async insertAggregatedAnalytics(patientId: string, gameId: string, data: object) {
    const query = `mutation InsertAggregateAnalytics($objects: [aggregate_analytics_insert_input!] = {}) {
      insert_aggregate_analytics(objects: $objects) {
        affected_rows
      }
    }`;

    const objects: AggregatedObject[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        objects.push({
          patient: patientId,
          game: gameId,
          key,
          value,
        });
      } else if (typeof value === 'object') {
        objects.push({
          patient: patientId,
          game: gameId,
          key: value.key,
          value: value.value,
          noOfSamples: value.noOfSamples,
        });
      }
    }
    await this.gqlService.client.request(query, { objects });
  }

  // TODO: remove this.
  // async updateAggregateAnalytics(gameId: string, data: object) {
  //   const query = `mutation UpdateAggregateAnalytics($gameId: uuid!, $aggregateAnalytics: jsonb!) {
  //     update_game_by_pk(pk_columns: {id: $gameId}, _append: {aggregateAnalytics: $aggregateAnalytics}) {
  //       id
  //     }
  //   }`;
  //   await this.gqlService.client.request(query, { gameId, aggregateAnalytics: data });
  // }
}
