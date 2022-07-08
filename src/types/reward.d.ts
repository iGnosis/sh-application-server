type RewardTypes = 'bronze' | 'silver' | 'gold';

interface Reward {
  tier: RewardTypes;
  isAccessed: boolean;
  isViewed: boolean;
  isUnlocked: boolean;
  description: string;
  unlockAtDayCompleted: number;
}

interface PatientRewards {
  rewards: Array<Reward>;
}
