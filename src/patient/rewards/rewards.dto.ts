import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class MarkRewardAsViewedDto {
  @ApiProperty({
    description: 'Reward Tier => bronze / gold / silver',
  })
  @IsNotEmpty()
  rewardTier: RewardTypes;
}
