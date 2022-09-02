export type PlotChartDTO = {
  startDate: Date;
  endDate: Date;
  userTimezone: string;
  patientId: string;
  chartType: 'avgAchievementRatio' | 'avgCompletionTime' | 'avgEngagementRatio';
  groupBy: 'day' | 'week' | 'month';
  isGroupByGames: boolean;
};
