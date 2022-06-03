export class GoalsApiResponse {
  id: string;
  createdAt: Date;
  sessionDurationInMin: number;
}

export class GroupGoalsByDate {
  date: Date;
  totalSessionDurationInMin: number;
}
