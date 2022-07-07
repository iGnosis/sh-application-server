type RewardTypes = 'bronze' | 'silver' | 'gold';

interface Reward {
  tier: RewardTypes;
  isAccessed: boolean;
  isVisited: boolean;
  isUnlocked: boolean;
  description: string;
  unlockAtDayCompleted: number;
}

interface PatientRewards {
  rewards: Array<Reward>;
}
