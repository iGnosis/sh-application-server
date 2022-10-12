import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { EventsService } from '../events/events.service';

const couponCodes = {
  bronze: 'PTMOBR',
  silver: 'PTMOGU',
  gold: 'PTMOPE',
};

@Injectable()
export class RewardsService {
  constructor(private gqlService: GqlService, private pinpointEventsService: EventsService) {}

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

  async markRewardAsViewed(rewards: Reward[], rewardTier: RewardTypes) {
    rewards.forEach((reward) => {
      if (reward.tier === rewardTier) {
        reward.isViewed = true;
      }
    });
    return rewards;
  }

  async markRewardAsAccessed(rewards: Reward[], rewardTier: RewardTypes) {
    rewards.forEach((reward) => {
      if (reward.tier === rewardTier) {
        reward.isAccessed = true;
      }
    });
    return rewards;
  }

  async unlockRewards(rewards: Reward[], daysCompleted: number) {
    for (let i = 0; i < rewards.length; i++) {
      if (daysCompleted >= rewards[i].unlockAtDayCompleted && !rewards[i].isUnlocked) {
        const tier = rewards[i].tier;
        const couponCode = couponCodes[tier];
        rewards[i].isUnlocked = true;
        rewards[i].couponCode = couponCode;
      }
    }
    return rewards;
  }

  /**
   * Triggers a pinpoint event if a new reward is unlocked.
   */
  async sendRewardsUnlockedEvent(userId: string, oldRewards: Reward[], newRewards: Reward[]) {
    if (oldRewards.length !== newRewards.length) {
      throw new HttpException(
        'oldRewards and newRewards length dont match',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const unlockedRewardsTier = new Set();
    for (let i = 0; i < oldRewards.length; i++) {
      const isOldRewardUnlocked = oldRewards[i].isUnlocked;
      const isNewRewardUnlocked = newRewards[i].isUnlocked;
      if (isNewRewardUnlocked && !isOldRewardUnlocked) {
        unlockedRewardsTier.add(newRewards[i].tier);
        await this.pinpointEventsService.rewardUnlockedEvent(userId, newRewards[i].tier);
      }
    }
    return unlockedRewardsTier;
  }
}
