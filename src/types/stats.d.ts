export class GoalsApiResponse {
  id: string;
  createdAt: Date;
  sessionDurationInMin: number;
}

export class DailyGoalsApiResponse {
  activity: string;
}

export class MonthlyGoalsApiResponse {
  createdAtLocaleDate: Date;
  activityEndedCount: number;
}

export class GroupGoalsByDate {
  date: Date;
  totalSessionDurationInMin: number;
}
