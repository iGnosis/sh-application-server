import { UserRole } from 'src/common/enums/role.enum';

export type AnalyticsDTO = {
  prompt: AnalyticsPromptDTO;
  reaction: AnalyticsReactionDTO;
  result: AnalyticsResultDTO;
};

export type AnalyticsPromptDTO = {
  id: string;
  type: string;
  timestamp: number;
  data: Sit2StandAnalyticsDTO | BeatboxerAnalyticsDTO | SoundExplorerAnalyticsDTO;
};

export type AnalyticsReactionDTO = {
  type: string;
  timestamp: number; // placeholder value.
  startTime: number; // placeholder value.
  completionTimeInMs?: number; // completion time in milliseconds.
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
  organizationId: string;
  game: string;
  key: string;
  value: number;
  noOfSamples?: number;
};

export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseDataMessageBody = {
  t: number; // unix epoch in ms
  g: string; // game UUID
  u: string; // user UUID
  p: PoseLandmark[];
};

export type QaMessageBody = {
  event: string;
  payload: any;
};

export type Auth = {
  id: string;
  patient: string;
  staff: string;
  createdAt: Date;
  expiryAt: Date;
  otp: number;
};

export class Email {
  to: Array<string>;
  cc?: Array<string>;
  bcc?: Array<string>;
  subject: string;
  text: string;
  body: string;
  from?: string;
  replyTo?: string;
}
export interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
    'x-hasura-organization-id'?: string;
  };
}

export class OrganizationConfiguration {
  colors: {
    [key: string]: any;
  };
  font: {
    family: string;
    url: string;
  };
  uiRbac: {
    [key: UserRole]: {
      ui: {
        top: any;
        left: any;
        route: any;
      };
    };
  };
}

export class Organization {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  configuration: OrganizationConfiguration;
  type: OrganizationTypeEnum;
  patientDomain: string;
  organizationDomain: string;
  logoUrl: string;
  isPublicSignUpEnabled: boolean;
}

export class Staff {
  id?: string;
  organizationId: string;
  organization?: Organization;
  email?: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastActive?: Date;
  firstName?: string;
  lastName?: string;
  type: UserRole;
  status?: string;
  phoneCountryCode: string;
  phoneNumber: string;
}

export class ShAdmin {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  type?: string;
  organizationId?: string;
}

export class Patient {
  id?: string;
  organizationId: string;
  organization?: Organization;
  createdAt?: Date;
  updatedAt?: Date;
  activeCareplan?: string;
  identifier?: string;
  nickname?: string;
  medicalConditions?: any;
  preferredGenres?: any;
  primaryTherapist?: string;
  onboardedBy?: string;
  email?: string;
  careGiverEmail?: string;
  phoneCountryCode: string;
  phoneNumber: string;
  canBenchmark?: boolean;
  type?: UserRole; // workaround TS Unions.
  firstName?: string;
  lastName?: string;
  namePrefix?: string;
}

export class PatientFeedback {
  patientByPatient: Patient;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  rating: number;
  recommendationScore: number;
}

export enum OrganizationTypeEnum {
  CLINIC = 'clinic',
  HOSPITAL = 'hospital',
  PROVIDER = 'provider',
}

export interface CardDetailsDTO {
  exp_month: number;
  exp_year: number;
  number: string;
}

type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'archived'
  | 'blocked'
  | 'trial_period'
  | 'trial_expired'
  | 'payment_pending';

interface HttpErrorWithReason {
  msg: string;
  reason: string;
}

interface S3CompletedParts {
  PartNumber: number;
  ETag: string;
}

interface CompleteMultipartUploadBody {
  filename: string;
  uploadId: string;
  parts: S3CompletedParts[];
}

interface UploadChunkBody {
  filename: string;
  uploadId: string;
  chunk: Blob;
  partNumber: number;
}
