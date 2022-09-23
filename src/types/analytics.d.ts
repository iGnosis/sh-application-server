export type AnalyticsDTO = {
  prompt: AnalyticsPromptDTO;
  reaction: AnalyticsReactionDTO;
  result: AnalyticsResultDTO;
};

export type AnalyticsPromptDTO = {
  type: string;
  timestamp: number;
  data: Sit2StandAnalyticsDTO | BeatboxerAnalyticsDTO | SoundExplorerAnalyticsDTO;
};

export type AnalyticsReactionDTO = {
  type: string;
  timestamp: number; // placeholder value.
  startTime: number; // placeholder value.
  completionTime?: number; // completion time in seconds.
};

export type AnalyticsResultDTO = {
  type: 'success' | 'failure';
  timestamp: number;
  score: number;
};

// individual game data
export type Sit2StandAnalyticsDTO = {
  number: number | string;
};

export type BeatboxerAnalyticsDTO = {
  leftBag: BagType | 'obstacle' | undefined;
  rightBag: BagType | 'obstacle' | undefined;
};

export type SoundExplorerAnalyticsDTO = {
  shapes: Shape[];
};

export type BagType = 'heavy-blue' | 'heavy-red' | 'speed-blue' | 'speed-red';
export type Shape = 'circle' | 'triangle' | 'rectangle' | 'wrong' | 'hexagon';

export type AggregatedObject = {
  patient: string;
  game: string;
  key: string;
  value: number;
  noOfSamples?: number;
};
