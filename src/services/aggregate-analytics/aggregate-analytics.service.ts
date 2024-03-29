import { Injectable } from '@nestjs/common';
import { AggregatedObject, AnalyticsDTO } from 'src/types/global';
import { GqlService } from '../clients/gql/gql.service';

@Injectable()
export class AggregateAnalyticsService {
  constructor(private gqlService: GqlService) {}

  averageAchievementRatio(analytics: AnalyticsDTO[]) {
    const correctPromptsCount = analytics.reduce((count, data) => {
      if (data.prompt.type !== 'start' && data.result.type === 'success') {
        count++;
      }
      return count;
    }, 0);

    // key, value & noOfSamples are required to store in aggregate_analytics table.
    return {
      key: 'avgAchievementRatio',
      value: parseFloat((correctPromptsCount / analytics.length).toFixed(2)) || 0,
      noOfSamples: analytics.length,
    };
  }

  averageCompletionTimeInMs(analytics: AnalyticsDTO[]) {
    const sumCompletionTime = analytics.reduce((sum, val) => {
      if (val.reaction.completionTimeInMs) {
        sum += val.reaction.completionTimeInMs;
      }
      return sum;
    }, 0);

    const countCompletionTimePrompts = analytics.reduce((count, val) => {
      if (val.reaction.completionTimeInMs) {
        count++;
      }
      return count;
    }, 0);

    // key, value & noOfSamples are required to store in aggregate_analytics table.
    return {
      key: 'avgCompletionTimeInMs',
      value: parseFloat((sumCompletionTime / countCompletionTimePrompts).toFixed(2)) || 0,
      noOfSamples: countCompletionTimePrompts,
    };
  }

  async insertAggregatedAnalytics(
    patientId: string,
    gameId: string,
    organizationId: string,
    data: object,
  ) {
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
          organizationId,
          key,
          value,
        });
      } else if (typeof value === 'object') {
        objects.push({
          patient: patientId,
          game: gameId,
          organizationId,
          key: value.key,
          value: value.value,
          noOfSamples: value.noOfSamples,
        });
      }
    }
    await this.gqlService.client.request(query, { objects });
  }
}
