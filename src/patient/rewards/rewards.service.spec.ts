import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from 'src/events/events.service';
import { GqlService } from 'src/services/gql/gql.service';
import { RewardsService } from './rewards.service';

describe('RewardsService', () => {
  let service: RewardsService;
  let rewards: Reward[];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RewardsService, GqlService, EventsService, ConfigService],
    }).compile();
    service = module.get<RewardsService>(RewardsService);
  });

  beforeEach(async () => {
    rewards = [
      {
        tier: 'bronze',
        isViewed: false,
        isAccessed: false,
        isUnlocked: false,
        couponCode: '',
        description: '',
        unlockAtDayCompleted: 5,
      },
      {
        tier: 'silver',
        isViewed: false,
        isAccessed: false,
        isUnlocked: false,
        couponCode: '',
        description: '',
        unlockAtDayCompleted: 10,
      },
      {
        tier: 'gold',
        isViewed: false,
        isAccessed: false,
        isUnlocked: false,
        couponCode: '',
        description: '',
        unlockAtDayCompleted: 15,
      },
    ];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('should unlock rewards', () => {
    it('should unlock bronze rewards', async () => {
      const noOfDaysCompleted = 5;
      const unlockedRewards = await service.unlockRewards(rewards, noOfDaysCompleted);
      expect(unlockedRewards).toHaveLength(3);
      expect(unlockedRewards[0].tier).toBe('bronze');
      expect(unlockedRewards[0].isUnlocked).toBe(true);
      expect(unlockedRewards[0].isAccessed).toBe(false);
      expect(unlockedRewards[0].isViewed).toBe(false);
      expect(unlockedRewards[0].couponCode).toEqual('PTMOBR');

      expect(unlockedRewards[1].tier).toBe('silver');
      expect(unlockedRewards[1].isUnlocked).toBe(false);
      expect(unlockedRewards[1].isAccessed).toBe(false);
      expect(unlockedRewards[1].isViewed).toBe(false);
      expect(unlockedRewards[1].couponCode).toEqual('');

      expect(unlockedRewards[2].tier).toBe('gold');
      expect(unlockedRewards[2].isUnlocked).toBe(false);
      expect(unlockedRewards[2].isAccessed).toBe(false);
      expect(unlockedRewards[2].isViewed).toBe(false);
      expect(unlockedRewards[2].couponCode).toEqual('');
    });

    it('should unlock silver rewards', async () => {
      const noOfDaysCompleted = 11;
      const unlockedRewards = await service.unlockRewards(rewards, noOfDaysCompleted);
      expect(unlockedRewards).toHaveLength(3);
      expect(unlockedRewards[0].tier).toBe('bronze');
      expect(unlockedRewards[0].isUnlocked).toBe(true);
      expect(unlockedRewards[0].isAccessed).toBe(false);
      expect(unlockedRewards[0].isViewed).toBe(false);
      expect(unlockedRewards[0].couponCode).toEqual('PTMOBR');

      expect(unlockedRewards[1].tier).toBe('silver');
      expect(unlockedRewards[1].isUnlocked).toBe(true);
      expect(unlockedRewards[1].isAccessed).toBe(false);
      expect(unlockedRewards[1].isViewed).toBe(false);
      expect(unlockedRewards[1].couponCode).toEqual('PTMOGU');

      expect(unlockedRewards[2].tier).toBe('gold');
      expect(unlockedRewards[2].isUnlocked).toBe(false);
      expect(unlockedRewards[2].isAccessed).toBe(false);
      expect(unlockedRewards[2].isViewed).toBe(false);
      expect(unlockedRewards[2].couponCode).toEqual('');
    });

    it('should unlock gold rewards', async () => {
      const noOfDaysCompleted = 21;
      const unlockedRewards = await service.unlockRewards(rewards, noOfDaysCompleted);
      expect(unlockedRewards).toHaveLength(3);
      expect(unlockedRewards[0].tier).toBe('bronze');
      expect(unlockedRewards[0].isUnlocked).toBe(true);
      expect(unlockedRewards[0].isAccessed).toBe(false);
      expect(unlockedRewards[0].isViewed).toBe(false);
      expect(unlockedRewards[0].couponCode).toEqual('PTMOBR');

      expect(unlockedRewards[1].tier).toBe('silver');
      expect(unlockedRewards[1].isUnlocked).toBe(true);
      expect(unlockedRewards[1].isAccessed).toBe(false);
      expect(unlockedRewards[1].isViewed).toBe(false);
      expect(unlockedRewards[1].couponCode).toEqual('PTMOGU');

      expect(unlockedRewards[2].tier).toBe('gold');
      expect(unlockedRewards[2].isUnlocked).toBe(true);
      expect(unlockedRewards[2].isAccessed).toBe(false);
      expect(unlockedRewards[2].isViewed).toBe(false);
      expect(unlockedRewards[2].couponCode).toEqual('PTMOPE');
    });
  });

  describe('should mark rewards as viewed', () => {
    it('should mark a bronze reward as viewed', async () => {
      const res = await service.markRewardAsViewed(rewards, 'bronze');
      expect(res).toHaveLength(3);
      expect(res[0].isViewed).toBe(true);
    });

    it('should mark a silver reward as viewed', async () => {
      const res = await service.markRewardAsViewed(rewards, 'silver');
      expect(res).toHaveLength(3);
      expect(res[1].isViewed).toBe(true);
    });

    it('should mark a gold reward as viewed', async () => {
      const res = await service.markRewardAsViewed(rewards, 'gold');
      expect(res).toHaveLength(3);
      expect(res[2].isViewed).toBe(true);
    });
  });

  describe('should mark rewards as accessed', () => {
    it('should mark a bronze reward as accessed', async () => {
      const res = await service.markRewardAsAccessed(rewards, 'bronze');
      expect(res).toHaveLength(3);
      expect(res[0].isAccessed).toBe(true);
    });

    it('should mark a silver reward as accessed', async () => {
      const res = await service.markRewardAsAccessed(rewards, 'silver');
      expect(res).toHaveLength(3);
      expect(res[1].isAccessed).toBe(true);
    });

    it('should mark a gold reward as accessed', async () => {
      const res = await service.markRewardAsAccessed(rewards, 'gold');
      expect(res).toHaveLength(3);
      expect(res[2].isAccessed).toBe(true);
    });
  });
});
