import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { EventsService } from 'src/events/events.service';
import { StatsService } from '../stats/stats.service';
import { MarkRewardAsAccessedDto, MarkRewardAsViewedDto } from './rewards.dto';
import { RewardsService } from './rewards.service';

const couponCodes = {
  bronze: 'PTMOBR',
  silver: 'PTMOGU',
  gold: 'PTMOPE',
};

@Roles(Role.PATIENT, Role.BENCHMARK)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('patient/rewards')
export class RewardsController {
  constructor(
    private statsService: StatsService,
    private rewardService: RewardsService,
    private pinpointEventsService: EventsService,
  ) {}

  // This API is to be run on every activity completion manually.
  // should be called from activity-exp.
  @HttpCode(200)
  @Post('update')
  async updateRewards(
    @Body('startDate') startDate: Date,
    @Body('endDate') endDate: Date,
    @Body('userTimezone') userTimezone: string,
    @User() userId: string,
  ) {
    try {
      startDate = new Date(startDate);
      endDate = new Date(endDate);
    } catch (err) {
      throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
    }

    const addOneDayToendDate = this.statsService.getFutureDate(endDate, 1);
    const { daysCompleted } = await this.statsService.getMonthlyGoalsNew(
      userId,
      startDate,
      addOneDayToendDate,
      userTimezone,
    );

    const patientRewards = await this.rewardService.getRewards(userId);
    if (!patientRewards || !patientRewards.patient_by_pk || !patientRewards.patient_by_pk.rewards) {
      return {
        status: 'success',
        message: 'No rewards to update',
        data: {},
      };
    }

    const unlockedRewards = await this.rewardService.unlockRewards(
      patientRewards.patient_by_pk.rewards,
      daysCompleted,
    );
    await this.rewardService.sendRewardsUnlockedEvent(
      userId,
      patientRewards.patient_by_pk.rewards,
      unlockedRewards,
    );

    // update Hasura JSONB
    await this.rewardService.updateRewards(userId, unlockedRewards);
    console.log('updated:unlockedRewards:', unlockedRewards);

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

    const viewedRewards = await this.rewardService.markRewardAsViewed(
      patientRewards.patient_by_pk.rewards,
      body.rewardTier,
    );

    await this.rewardService.updateRewards(userId, viewedRewards);
    return {
      status: 'success',
      data: {},
    };
  }

  @HttpCode(200)
  @Post('accessed')
  async markRewardAsAccessed(@Body() body: MarkRewardAsAccessedDto, @User() userId: string) {
    const { rewardTier } = body;
    const patientRewards = await this.rewardService.getRewards(userId);
    if (!patientRewards || !patientRewards.patient_by_pk || !patientRewards.patient_by_pk.rewards) {
      return {
        status: 'success',
        message: 'No rewards to update',
        data: {},
      };
    }

    const accessedRewards = await this.rewardService.markRewardAsAccessed(
      patientRewards.patient_by_pk.rewards,
      rewardTier,
    );
    await this.rewardService.updateRewards(userId, accessedRewards);
    await this.pinpointEventsService.rewardAccessedEvent(userId, rewardTier);

    return {
      status: 'success',
      data: {},
    };
  }
}
