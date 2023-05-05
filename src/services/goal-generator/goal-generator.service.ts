import { HttpException, Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { Badge, Goal, PatientBadge, UserContext } from 'src/types/global';
import { BadgeType, GoalStatus, Metrics } from 'src/types/enum';
import { StatsService } from '../patient-stats/stats.service';
import { GameService } from '../game/game.service';
import { GameName } from 'src/types/enum';
@Injectable()
export class GoalGeneratorService {
  constructor(
    private gqlService: GqlService,
    private statsService: StatsService,
    private gameService: GameService,
  ) {}

  async generateGoals(patientId: string, gameName: GameName): Promise<Goal[]> {
    // const recentGoal: Goal = await this.getRecentGoal(patientId);
    // if (recentGoal && new Date(recentGoal.createdAt).toDateString() === new Date().toDateString()) {
    //   throw new HttpException('Goals already generated for today', 400);
    // }

    const userContext: UserContext = await this.getUserContext(patientId);
    const userBadges = await this.getUserBadges(patientId);
    const achievableBadges = await this.getAchievableBadges(userContext, userBadges);
    const goals = await this.createGoals(achievableBadges, patientId, gameName);
    return goals;
  }

  async getAchievableBadges(userContext: UserContext, userBadges: PatientBadge[]) {
    const badges: Badge[] = await this.getAllActiveBadges();
    const filteredBadges = badges.filter((badge) => {
      // if badge is single-time unlock and already unlocked, then remove it
      const userBadge = userBadges.find((userBadge) => userBadge.badge === badge.id);
      if (userBadge) {
        if (userBadge.badgeByBadge.badgeType === BadgeType.SINGLE_UNLOCK) {
          return false;
        }
      }
      return true;
    });
    const achievableBadges = filteredBadges.filter((badge) => {
      if (badge.metric) {
        // if the metric value in userContext is less than the minVal of badge, then it's achievable
        const metricValue = userContext[badge.metric] || 0;
        if (metricValue < badge.minVal) {
          return true;
        }
      }
      return false;
    });
    return achievableBadges;
  }

  async createGoals(availableBadges: Badge[], patientId: string, gameName: string) {
    const goals: Goal[] = [];
    const metricsGenerated: Metrics[] = [];
    const recentGoal: Goal = await this.getRecentGoal(patientId);

    availableBadges.forEach(async (badge) => {
      if (metricsGenerated.includes(badge.metric)) {
        return;
      }

      if (!badge.metric.includes(gameName)) {
        return;
      }

      const goal: Goal = {
        patientId,
        name: this.generateGoalName(badge),
        rewards: [
          {
            id: badge.id,
            metric: badge.metric,
            name: badge.name,
            tier: badge.tier,
          },
        ],
        status: GoalStatus.PENDING,
      };

      // so that previous goal is not same as new goal.
      if (recentGoal.status === GoalStatus.EXPIRED && recentGoal.name === goal.name) {
        return;
      }

      metricsGenerated.push(badge.metric);

      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 1);

      await this.addGoalToDB(goal, patientId, expiredAt.toISOString());

      goals.push(goal);

      // atm, we only want to generate 1 goal at a time.
      if (goals.length >= 1) {
        return goals;
      }
    });
    return goals;
  }

  // TODO: Call this API at certian events.
  // 1. Game end
  // 2. Patient portal daily login -- when they checkin their mood.
  async updatePatientContext(patientId: string, metrics: Metrics[]) {
    const context = await this.getUserContext(patientId);

    metrics.forEach(async (metric) => {
      switch (metric) {
        case Metrics.PATIENT_STREAK:
          context[Metrics.PATIENT_STREAK] = await this.statsService.calculateStreak(patientId);
          break;
        case Metrics.PATIENT_TOTAL_ACTIVITY_DURATION:
          context[Metrics.PATIENT_TOTAL_ACTIVITY_DURATION] =
            await this.statsService.totalActivityDuration(patientId);
          break;
        case Metrics.PATIENT_TOTAL_ACTIVITY_COUNT:
          context[Metrics.PATIENT_TOTAL_ACTIVITY_COUNT] =
            await this.statsService.totalActivityCount(patientId);
          break;
        case Metrics.WEEKLY_TIME_SPENT:
          context[Metrics.WEEKLY_TIME_SPENT] =
            await this.statsService.totalWeeklyActivityTimeDuration(patientId);
          break;
        case Metrics.MONTHLY_TIME_SPENT:
          context[Metrics.MONTHLY_TIME_SPENT] =
            await this.statsService.totalMonthlyActivityTimeDuration(patientId);
          break;
        case Metrics.SIT_STAND_ACHIEVE_PROMPTS:
          context[Metrics.SIT_STAND_ACHIEVE_PROMPTS] = await this.gameService.getMaxPrompts(
            patientId,
            GameName.SIT_STAND_ACHIEVE,
          );
          break;
        case Metrics.BEAT_BOXER_PROMPTS:
          context[Metrics.BEAT_BOXER_PROMPTS] = await this.gameService.getMaxPrompts(
            patientId,
            GameName.BEAT_BOXER,
          );
          break;
        case Metrics.SOUND_EXPLORER_BLUE_ORBS:
          context[Metrics.SOUND_EXPLORER_BLUE_ORBS] = await this.gameService.getMaxBlueOrbs(
            patientId,
          );
          break;
        case Metrics.SOUND_EXPLORER_RED_ORBS:
          context[Metrics.SOUND_EXPLORER_RED_ORBS] = await this.gameService.getMaxRedOrbs(
            patientId,
          );
          break;
        case Metrics.MOVING_TONES_PROMPTS:
          context[Metrics.MOVING_TONES_PROMPTS] = await this.gameService.getMaxPrompts(
            patientId,
            GameName.MOVING_TONES,
          );
          break;
        case Metrics.SIT_STAND_ACHIEVE_COMBO:
          context[Metrics.SIT_STAND_ACHIEVE_COMBO] = await this.gameService.getMaxCombo(
            patientId,
            GameName.SIT_STAND_ACHIEVE,
          );
          break;
        case Metrics.BEAT_BOXER_COMBO:
          context[Metrics.BEAT_BOXER_COMBO] = await this.gameService.getMaxCombo(
            patientId,
            GameName.BEAT_BOXER,
          );
          break;
        case Metrics.SOUND_EXPLORER_COMBO:
          context[Metrics.SOUND_EXPLORER_COMBO] = await this.gameService.getMaxCombo(
            patientId,
            GameName.SOUND_EXPLORER,
          );
          break;
        case Metrics.MOVING_TONES_COMBO:
          context[Metrics.MOVING_TONES_COMBO] = await this.gameService.getMaxCombo(
            patientId,
            GameName.MOVING_TONES,
          );
          break;
        // case Metrics.LEADERBOARD_POSITION:
        //   return
        // case Metrics.GAME_XP:
        //   return
        // case Metrics.HIGHSCORE:
        //   return
        // case Metrics.SIT_STAND_ACHIEVE_LEADERBOARD_POSITION:
        //   return
        // case Metrics.BEAT_BOXER_LEADERBOARD_POSITION:
        //   return
        // case Metrics.SOUND_EXPLORER_LEADERBOARD_POSITION:
        //   return
        // case Metrics.MOVING_TONES_LEADERBOARD_POSITION:
        //   return
      }
    });

    const query = `mutation UpdateUserContext($patientId: uuid!, $context: jsonb!) {
      update_patient_by_pk(pk_columns: {id: $patientId}, _set: {context: $context}) {
        id
      }
    }`;
    await this.gqlService.client.request(query, { patientId });
  }

  async verifyGoalCompletion(patientId: string) {
    const context = await this.getUserContext(patientId);
    const mostRecentGoal = await this.getRecentGoal(patientId);
    mostRecentGoal.rewards.forEach(async (reward) => {
      if (context[reward.metric] >= reward.minVal && context[reward.metric] <= reward.maxVal) {
        // reward criteria is met
        let count = 0;
        const badge = await this.isPatientBadgeExist(patientId, reward.id);
        if (badge) {
          count = badge.count + 1;
        }
        await this.unlockBadge(patientId, reward.id, count);
        await this.markGoalAsCompleted(mostRecentGoal.id);
        // alert frontend client via sockets (?) to show real-time badge unlocks
        // OR
        // maintain some sort of cache in frontend (?)
      }
    });
  }

  // async getGoalStatus(goalId: string) {}
  // async refreshGoal(goalId: string) {}

  capitalize(str: string | string[]) {
    if (!Array.isArray(str)) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    return str.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  generateGoalName(badge: Badge) {
    switch (badge.metric) {
      case Metrics.PATIENT_STREAK:
        return 'Login for ' + badge.minVal + ' days in a row';
      case Metrics.PATIENT_TOTAL_ACTIVITY_DURATION:
        return 'Complete ' + badge.minVal + ' minutes of activity';
      case Metrics.PATIENT_TOTAL_ACTIVITY_COUNT:
        return 'Complete ' + badge.minVal + ' activities';
      case Metrics.WEEKLY_TIME_SPENT:
        return 'Complete ' + badge.minVal + ' minutes of activities this week';
      case Metrics.MONTHLY_TIME_SPENT:
        return 'Complete ' + badge.minVal + ' minutes of activities this month';
      // case Metrics.LEADERBOARD_POSITION:
      //   return 'Reach ' + badge.minVal + ' position on the leaderboard';
      // case Metrics.GAME_XP:
      //   return 'Earn ' + badge.minVal + ' XP';
      case Metrics.SIT_STAND_ACHIEVE_PROMPTS:
        return 'Complete ' + badge.minVal + ' prompts in Sit Stand Achieve';
      case Metrics.BEAT_BOXER_PROMPTS:
        return 'Complete ' + badge.minVal + ' prompts in Beat Boxer';
      case Metrics.SOUND_EXPLORER_RED_ORBS:
        return 'Collect ' + badge.minVal + ' red orbs in Sound Explorer';
      case Metrics.SOUND_EXPLORER_BLUE_ORBS:
        return 'Collect ' + badge.minVal + ' blue orbs in Sound Explorer';
      case Metrics.MOVING_TONES_PROMPTS:
        return 'Complete ' + badge.minVal + ' prompts in Moving Tones';
      case Metrics.SIT_STAND_ACHIEVE_COMBO:
        return 'Reach ' + badge.minVal + 'x combo in Sit Stand Achieve';
      case Metrics.BEAT_BOXER_COMBO:
        return 'Reach ' + badge.minVal + 'x combo in Beat Boxer';
      case Metrics.SOUND_EXPLORER_COMBO:
        return 'Reach ' + badge.minVal + 'x combo in Sound Explorer';
      case Metrics.MOVING_TONES_COMBO:
        return 'Reach ' + badge.minVal + 'x combo in Moving Tones';
      // case Metrics.HIGHSCORE:
      //   return 'Beat your previous highscore ' + badge.minVal;
      // case Metrics.SOUND_EXPLORER_RED_ORBS:
      //   return 'Collect ' + badge.minVal + ' red orbs in Sound Explorer';
      // case Metrics.SIT_STAND_ACHIEVE_LEADERBOARD_POSITION:
      //   return 'Reach ' + badge.minVal + ' position on the Sit Stand Achieve leaderboard';
      // case Metrics.BEAT_BOXER_LEADERBOARD_POSITION:
      //   return 'Reach ' + badge.minVal + ' position on the Beat Boxer leaderboard';
      // case Metrics.SOUND_EXPLORER_LEADERBOARD_POSITION:
      //   return 'Reach ' + badge.minVal + ' position on the Sound Explorer leaderboard';
      // case Metrics.MOVING_TONES_LEADERBOARD_POSITION:
      //   return 'Reach ' + badge.minVal + ' position on the Moving Tones leaderboard';
    }
  }

  async getUserBadges(patientId: string): Promise<PatientBadge[]> {
    const query = `
    query GetUserBadges($patientId: uuid!) {
      patient_badge(where: {patient: {_eq: $patientId}}) {
        id
        count
        badge
        badgeByBadge {
          badgeType
        }
      }
    }`;
    return await this.gqlService.client.request(query, { patientId });
  }

  async addGoalToDB(goal: Goal, patientId: string, expiredAt: string) {
    const query = `
    mutation AddGoal($expiryAt: timestamptz!, $patientId: uuid!, $rewards: jsonb!, $name: String!) {
      insert_goal(objects: {expiryAt: $expiryAt, patientId: $patientId, rewards: $rewards, name: $name}) {
        affected_rows
      }
    }`;
    return await this.gqlService.client.request(query, {
      patientId,
      expiredAt,
      rewards: goal.rewards,
      name: goal.name,
    });
  }

  async getRecentGoal(patientId: string): Promise<Goal> {
    const query = `
    query GetRecentGoal($patientId: uuid!) {
      goal(where: {patientId: {_eq: $patientId}}, order_by: {createdAt: desc}, limit: 1) {
        id
        createdAt
        expiryAt
        name
        rewards
        status
      }
    }`;
    const goals = await this.gqlService.client.request(query, { patientId });
    return goals.goal[0];
  }

  async getUserContext(patientId: string): Promise<UserContext> {
    const query = `
      query GetUserContext($patientId: uuid!) {
        patient_by_pk(id: $patientId){
          context
        }
      }`;
    const patient: { patient_by_pk: { context: UserContext } } =
      await this.gqlService.client.request(query, { patientId });
    return patient.patient_by_pk.context;
  }

  async getAllActiveBadges(): Promise<Badge[]> {
    const query = `
    query GetAllBadges {
      badge(where: {status: {_eq: active}}) {
        id
        dimension
        metric
        maxVal
        minVal
        name
        status
        tier
      }
    }`;
    return await this.gqlService.client.request(query);
  }

  async unlockBadge(patientId: string, badgeId: string, count: number) {
    const query = `mutation UpsertPatientBadge($badge: uuid!, $patient: uuid!, $count: Int!) {
      insert_patient_badge_one(object: {badge: $badge, patient: $patient, count: $count}, on_conflict: {constraint: patient_badge_patient_badge_key, update_columns: count}) {
        id
      }
    }`;
    await this.gqlService.client.request(query, { patientId, badgeId, count });
  }

  async markGoalAsCompleted(goalId: string) {
    const query = `mutation MarkGoalAsCompleted($goalId: uuid!, $status: goal_status_enum = completed) {
      update_goal_by_pk(pk_columns: {id: $goalId}, _set: {status: $status}) {
        id
      }
    }`;
    await this.gqlService.client.request(query, { goalId, status: GoalStatus.COMPLETED });
  }

  async isPatientBadgeExist(patientId: string, badgeId: string): Promise<PatientBadge | false> {
    const query = `query GetPatientBadge($patientId: uuid!, $badgeId: uuid!) {
      patient_badge(where: {badge: {_eq: $badgeId}, patient: {_eq: $patientId}}) {
        id
        count
      }
    }`;
    const patientBadge = await this.gqlService.client.request(query, { patientId, badgeId });
    if (patientBadge && patientBadge.patient_badge && patientBadge.patient_badge.id) {
      return patientBadge.patient_badge;
    }
    return false;
  }
}
