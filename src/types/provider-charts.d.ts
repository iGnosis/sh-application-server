export type PlotChartDTO = {
  startDate: Date;
  endDate: Date;
  userTimezone: string;
  patientId?: string;
  chartType: ChartType;
  groupBy?: GroupBy;
  isGroupByGames?: boolean;
};

export type PlotHeatmapDTO = {
  startDate: Date;
  endDate: Date;
  userTimezone: string;
  sortBy: SortBy;
  sortDirection: SortDirection;
  limit: number;
  offset: number;
  showInactive: boolean;
};

export type ChartType = 'avgAchievementRatio' | 'avgCompletionTime' | 'avgEngagementRatio';
export type GroupBy = 'day' | 'week' | 'month';
export type SortBy = 'recentActivity' | 'overallActivity';
export type SortDirection = 'asc' | 'desc';
