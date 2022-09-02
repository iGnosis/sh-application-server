export type PlotChartDTO = {
  startDate: Date;
  endDate: Date;
  userTimezone: string;
  patientId: string;
  chartType: ChartType;
  groupBy: GroupBy;
  isGroupByGames: boolean;
};

export type ChartType = 'avgAchievementRatio' | 'avgCompletionTime' | 'avgEngagementRatio';
export type GroupBy = 'day' | 'week' | 'month';
