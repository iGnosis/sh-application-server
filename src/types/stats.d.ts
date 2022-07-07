export class GoalsApiResponse {
  id: string;
  createdAt: Date;
  sessionDurationInMin: number;
}

export class MonthlyGoalsApiResponse {
  createdAtLocaleDate: Date;
  activityEndedCount: count;
}

export class GroupGoalsByDate {
  date: Date;
  totalSessionDurationInMin: number;
}
