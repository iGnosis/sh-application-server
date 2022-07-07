import { Injectable } from '@nestjs/common';
import { GqlService } from 'src/services/gql/gql.service';

@Injectable()
export class RewardsService {
  constructor(private gqlService: GqlService) {}

  async getRewards(userId) {
    const getPatientRewards = `query GetPatientReward($userId: uuid!) {
      patient_by_pk(id: $userId) {
        rewards
      }
    }`;
    // GQL query to fetch patient's 'reward'
    const patientRewards: {
      patient_by_pk: PatientRewards;
    } = await this.gqlService.client.request(getPatientRewards, { userId });

    return patientRewards;
  }

  async updateRewards(userId: string, rewards: Array<Reward>) {
    // GQL query to update JSON
    const updatePatientRewards = `mutation UpdateReward($userId: uuid!, $rewards: jsonb!) {
      update_patient_by_pk(pk_columns: {id: $userId}, _set: {rewards: $rewards}) {
        id
      }
    }`;
    await this.gqlService.client.request(updatePatientRewards, {
      userId,
      rewards,
    });
  }
}
