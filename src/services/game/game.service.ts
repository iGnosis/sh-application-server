import { Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { AnalyticsDTO, Game } from 'src/types/global';
import { GameName } from 'src/types/enum';

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

  async getMostRecentGame(patientId: string): Promise<Game> {
    const query = `query MostRecentGame($patientId: uuid!) {
      game(where: {patient: {_eq: $patientId}}, limit: 1, order_by: {createdAt: desc}) {
        id
        createdAt
        endedAt
        game
        analytics
        calibrationDuration
        patient
        repsCompleted
        settings
        totalDuration
        totalMovementCoins
        totalXpCoins
        updatedAt
      }
    }`;
    const resp = await this.gqlService.client.request(query, { patientId });
    return resp.game;
  }

  async getGamesByName(patientId: string, gameName: GameName): Promise<Game[]> {
    const query = `query GameByName($gameName: String!, $patientId: uuid!) {
      game(where: {game_name: {name: {_eq: $gameName}}, patient: {_eq: $patientId}}, order_by: {createdAt: desc}) {
        id
        analytics
        maxCombo
        orbsCount
      }
    }`;

    const response = await this.gqlService.client.request(query, {
      patientId,
      gameName,
    });

    return response.game;
  }

  async setGameEndedAt(gameId: string, endedAt: string) {
    const query = `mutation SetGameEndedAt($gameId: uuid!, $endedAt: timestamptz!) {
      update_game_by_pk(pk_columns: {id: $gameId}, _set: {endedAt: $endedAt}) {
        id
      }
    }`;
    return await this.gqlService.client.request(query, { gameId, endedAt });
  }

  async updateGameXp(gameId: string, xp: number) {
    const query = `mutation SetGameXp($gameId: uuid!, $totalXpCoins: Int!) {
      update_game_by_pk(pk_columns: {id: $gameId}, _set: { totalXpCoins: $totalXpCoins}) {
        id
      }
    }`;
    return await this.gqlService.client.request(query, { gameId, totalXpCoins: xp });
  }

  async getMaxPrompts(patientId: string, gameName: GameName) {
    const games = await this.getGamesByName(patientId, gameName);
    const analytics = games.map((game) => game.analytics);
    let maxPromptsLen = 0;
    analytics.forEach((a) => {
      if (a && a.length && a.length > maxPromptsLen) {
        maxPromptsLen = a.length;
      }
    });
    return maxPromptsLen;
  }

  async getMaxCombo(patientId: string, gameName: GameName) {
    const games = await this.getGamesByName(patientId, gameName);
    return Math.max(...games.map((game) => game.maxCombo));
  }

  async getMaxRedOrbs(patientId: string, gameName: GameName = GameName.SOUND_EXPLORER) {
    const games = await this.getGamesByName(patientId, gameName);
    return Math.max(...games.map((game) => game.orbsCount.red));
  }

  async getMaxBlueOrbs(patientId: string, gameName: GameName = GameName.SOUND_EXPLORER) {
    const games = await this.getGamesByName(patientId, gameName);
    return Math.max(...games.map((game) => game.orbsCount.blue));
  }

  async getMaxOrbs(patientId: string, gameName: GameName = GameName.SOUND_EXPLORER) {
    const games = await this.getGamesByName(patientId, gameName);
    return Math.max(...games.map((game) => game.orbsCount.blue + game.orbsCount.red));
  }
}
