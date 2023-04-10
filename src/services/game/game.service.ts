import { Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { AnalyticsDTO } from 'src/types/global';

@Injectable()
export class GameService {
  constructor(private gqlService: GqlService) {}

  async getGameByPk(id: string): Promise<{
    id: string;
    endedAt: string;
    analytics: AnalyticsDTO[];
  }> {
    const query = `query GetGame($id: uuid!) {
      game_by_pk(id: $id) {
        id
        endedAt
        analytics
      }
    }`;
    const game = await this.gqlService.client.request(query, { id });
    return game.game_by_pk;
  }

  async setGameEndedAt(gameId: string, endedAt: string) {
    const query = `mutation SetGameEndedAt($gameId: uuid!, $endedAt: timestamptz!) {
      update_game_by_pk(pk_columns: {id: $gameId}, _set: {endedAt: $endedAt}) {
        id
      }
    }`;
    return await this.gqlService.client.request(query, { gameId, endedAt });
  }
}
