import { Injectable } from '@nestjs/common';

@Injectable()
export class GoalGeneratorService {
  async generateGoals(patientId: string) {
    // 1. Check if goals already generated for patient today
    // 2. Fetch patient's context object & leaderboard rankings
    // 3. Fetch all the badges available
    // 4. Filter out / remove badges that are single-time unlock & has already been unlocked
    // 5. Pick achieveable badges -- need to build algorithm for this.
    // 6. Create goal for the patient
    // 7. Return goals
  }

  async verifyGoalCompletion(goalId: string) {
    // 1. Fetches a patient goal from ID
    // 2. Checks rewards criteria and verifies that it's been met
    // 3. Make an entry in patient_badge table /or/ increment count of badge if already unlocked
    // 4. Mark goal as completed
  }

  // async getGoalStatus(goalId: string) {}
  // async refreshGoal(goalId: string) {}
}
