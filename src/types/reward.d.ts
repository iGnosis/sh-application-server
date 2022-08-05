type RewardTypes = 'bronze' | 'silver' | 'gold';

interface Reward {
  tier: RewardTypes;
  isViewed: boolean;
  isAccessed: boolean;
  isUnlocked: boolean;
  couponCode: string;
  description: string;
  unlockAtDayCompleted: number;
}

interface PatientRewards {
  rewards: Array<Reward>;
}
