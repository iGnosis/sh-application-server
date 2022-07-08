import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GqlService } from 'src/services/gql/gql.service';
import { StatsService } from '../stats/stats.service';
import { MarkRewardAsViewedDto } from './rewards.dto';
import { RewardsService } from './rewards.service';

@Roles(Role.PATIENT, Role.PLAYER)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('patient/rewards')
export class RewardsController {
  constructor(
    private statsService: StatsService,
    private gqlService: GqlService,
    private rewardService: RewardsService,
  ) {}

  // Call this API on every activity completion (?)
  @HttpCode(200)
  @Post('update')
  async updateRewards(@User() userId: string) {
    const date = new Date();
    const startDateOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDateOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const addOneDayToendDate = this.statsService.getFutureDate(endDateOfMonth, 1);
    const dbTimezone = 'Etc/UTC';

    const results = await this.statsService.getMonthlyGoals(
      userId,
      startDateOfMonth,
      addOneDayToendDate,
      dbTimezone,
    );

    // Days having activityEnded count >= 3 would be considered as Active
    const monthlyDaysCompleted = results.filter((val) => val.activityEndedCount >= 3).length;

    const patientRewards = await this.rewardService.getRewards(userId);
    if (!patientRewards || !patientRewards.patient_by_pk || !patientRewards.patient_by_pk.rewards) {
      return {
        status: 'success',
        message: 'No rewards to update',
        data: {},
      };
    }
    console.log('patientRewards:', patientRewards.patient_by_pk.rewards);

    // Update Reward JSON
    patientRewards.patient_by_pk.rewards.forEach((reward) => {
      if (monthlyDaysCompleted >= reward.unlockAtDayCompleted) {
        reward.isUnlocked = true;
      }
    });

    await this.rewardService.updateRewards(userId, patientRewards.patient_by_pk.rewards);

    return {
      status: 'success',
      data: {},
    };
  }

  @HttpCode(200)
  @Post('viewed')
  async markRewardAsViewed(@Body() body: MarkRewardAsViewedDto, @User() userId: string) {
    const patientRewards = await this.rewardService.getRewards(userId);
    if (!patientRewards || !patientRewards.patient_by_pk || !patientRewards.patient_by_pk.rewards) {
      return {
        status: 'success',
        message: 'No rewards to update',
        data: {},
      };
    }
    patientRewards.patient_by_pk.rewards.forEach((val) => {
      if (val.tier === body.rewardTier) {
        val.isViewed = true;
      }
    });
    await this.rewardService.updateRewards(userId, patientRewards.patient_by_pk.rewards);
    return {
      status: 'success',
      data: {},
    };
  }
}
