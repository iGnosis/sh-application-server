import { Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { Badge, Goal, PatientBadge, UserContext } from 'src/types/global';
import { Metrics } from 'src/types/enum';
@Injectable()
export class GoalGeneratorService {
  constructor(private gqlService: GqlService) {}

  async getGoal(patientId: string): Promise<Goal[]> {
    // 1. Check if goals already generated for patient today

    const recentGoal: { createdAt: string } = await this.getRecentGoal(patientId);
    // we don't want to generate goals for the same day
    if (recentGoal && new Date(recentGoal.createdAt).toDateString() === new Date().toDateString()) {
      return;
    }

    // 2. Fetch patient's context object
    const userContext: UserContext = await this.getUserContext(patientId);

    // 3. Fetch all the active badges available

    // 4. Filter out / remove badges that are single-time unlock & has already been unlocked
    const userBadges = await this.getUserBadges(patientId);

    // 5. Pick achieveable badges -- need to build algorithm for this.
    const achievableBadges = await this.getAchievableBadges(userContext, userBadges);

    // 6. Create goal for the patient
    const goals = await this.generateGoals(achievableBadges, patientId);

    // 7. Return goals

    return goals;
  }

  async getAchievableBadges(userContext: UserContext, userBadges: PatientBadge[]) {
    const badges: Badge[] = await this.getAllActiveBadges();
    const filteredBadges = badges.filter((badge) => {
      // if badge is single-time unlock and already unlocked, then remove it
      const userBadge = userBadges.find((userBadge) => userBadge.badge === badge.id);
      if (userBadge) {
        if (userBadge.badgeByBadge.badgeType === 'singleUnlock') {
          return false;
        }
      }
      return true;
    });
    console.log('filteredBadges::', filteredBadges);

    const achievableBadges = filteredBadges.filter((badge) => {
      switch (badge.metric) {
        case Metrics.PATIENT_STREAK:
          if (userContext.PATIENT_STREAK < badge.minVal) {
            return true;
          }
          break;
        // TODO: Add more cases here
        default:
          return false;
      }
      return false;
    });
    return achievableBadges;
  }

  async generateGoals(availableBadges: Badge[], patientId: string) {
    const goals: Goal[] = [];
    availableBadges.forEach((badge) => {
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
      };

      // TODO: Add goal to DB
      goals.push(goal);
    });
    return goals;
  }

  async updatePatientContext(patientId: string, metric: Metrics) {
    // 1. input "metric" so we know which metric to update
    // 2. fetches a patientContext
    // 3. fetches metrics so we an update user context
    // 4. update patient context with latest calculated metric
  }

  async verifyGoalCompletion(patientId: string) {
    // 1. fetches a patientContext and patient goal from patientID
    const context = await this.getUserContext(patientId);
    // 2. checks rewards criteria and verifies that it's been met
    // 3. make an entry in patient_badge table /or/ increment count of badge if already unlocked
    // 4. mark goal as completed
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
      case Metrics.LEADERBOARD_POSITION:
        return 'Reach ' + badge.minVal + ' position on the leaderboard';
      case Metrics.GAME_XP:
        return 'Earn ' + badge.minVal + ' XP';
      case Metrics.SIT_STAND_ACHIEVE_PROMPTS:
        return 'Complete ' + badge.minVal + ' prompts in Sit Stand Achieve';
      case Metrics.BEAT_BOXER_PROMPTS:
        return 'Complete ' + badge.minVal + ' prompts in Beat Boxer';
      case Metrics.SOUND_EXPLORER_ORBS:
        return 'Collect ' + badge.minVal + ' orbs in Sound Explorer';
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
      case Metrics.HIGHSCORE:
        return 'Beat your previous highscore ' + badge.minVal;
      case Metrics.SOUND_EXPLORER_RED_ORBS:
        return 'Collect ' + badge.minVal + ' red orbs in Sound Explorer';
      case Metrics.SIT_STAND_ACHIEVE_LEADERBOARD_POSITION:
        return 'Reach ' + badge.minVal + ' position on the Sit Stand Achieve leaderboard';
      case Metrics.BEAT_BOXER_LEADERBOARD_POSITION:
        return 'Reach ' + badge.minVal + ' position on the Beat Boxer leaderboard';
      case Metrics.SOUND_EXPLORER_LEADERBOARD_POSITION:
        return 'Reach ' + badge.minVal + ' position on the Sound Explorer leaderboard';
      case Metrics.MOVING_TONES_LEADERBOARD_POSITION:
        return 'Reach ' + badge.minVal + ' position on the Moving Tones leaderboard';
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

  async getRecentGoal(patientId: string) {
    const query = `
    query GetRecentGoal($patientId: uuid!) {
      goal(where: {patientId: {_eq: $patientId}}, order_by: {createdAt: desc}, limit: 1) {
        createdAt
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
}
