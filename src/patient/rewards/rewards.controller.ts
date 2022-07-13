import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { UserObj } from 'src/auth/decorators/userObj.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { EventsService } from 'src/events/events.service';
import { UserObjDecorator } from '../../types/user';
import { StatsService } from '../stats/stats.service';
import { MarkRewardAsAccessedDto, MarkRewardAsViewedDto } from './rewards.dto';
import { RewardsService } from './rewards.service';

const couponCodes = {
  bronze: 'PTMOBR',
  silver: 'PTMOGU',
  gold: 'PTMOPE',
};

@Roles(Role.PATIENT, Role.PLAYER)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('patient/rewards')
export class RewardsController {
  constructor(
    private statsService: StatsService,
    private rewardService: RewardsService,
    private pinpointEventsService: EventsService,
  ) {}

  // This API runs on every activity completion.
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

    for (let i = 0; i < patientRewards.patient_by_pk.rewards.length; i++) {
      if (
        monthlyDaysCompleted >= patientRewards.patient_by_pk.rewards[i].unlockAtDayCompleted &&
        !patientRewards.patient_by_pk.rewards[i].isUnlocked
      ) {
        const tier = patientRewards.patient_by_pk.rewards[i].tier;
        const couponCode = couponCodes[tier];

        patientRewards.patient_by_pk.rewards[i].isUnlocked = true;
        patientRewards.patient_by_pk.rewards[i].couponCode = couponCode;

        await this.pinpointEventsService.rewardUnlockedEvent(
          userId,
          patientRewards.patient_by_pk.rewards[i].tier,
        );
      }
    }
    // update Hasura JSONB
    await this.rewardService.updateRewards(userId, patientRewards.patient_by_pk.rewards);
    console.log('updated:patientRewards:', patientRewards.patient_by_pk.rewards);

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

  @HttpCode(200)
  @Post('accessed')
  async markRewardAsAccessed(
    @Body() body: MarkRewardAsAccessedDto,
    @UserObj() userObj: UserObjDecorator,
  ) {
    const { rewardTier } = body;
    const { sub: userId } = userObj;

    const patientRewards = await this.rewardService.getRewards(userId);
    if (!patientRewards || !patientRewards.patient_by_pk || !patientRewards.patient_by_pk.rewards) {
      return {
        status: 'success',
        message: 'No rewards to update',
        data: {},
      };
    }

    let rewardAccessed: RewardTypes;
    patientRewards.patient_by_pk.rewards.forEach((reward) => {
      if (reward.tier === rewardTier && !reward.isAccessed) {
        reward.isAccessed = true;
        rewardAccessed = reward.tier;
      }
    });

    // update JSONB in Postgres
    await this.rewardService.updateRewards(userId, patientRewards.patient_by_pk.rewards);
    await this.pinpointEventsService.rewardAccessedEvent(userId, rewardAccessed);

    return {
      status: 'success',
      data: {},
    };
  }
}
