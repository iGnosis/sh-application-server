// Hasura roles.
export enum UserRole {
  THERAPIST = 'therapist',
  PATIENT = 'patient',
  CARETAKER = 'caretaker',
  BENCHMARK = 'benchmark',
  ORG_ADMIN = 'org_admin',
  SH_ADMIN = 'sh_admin',
  GUEST = 'guest',
}

export enum LoginUserType {
  PATIENT = 'patient',
  BENCHMARK = 'benchmark',
  STAFF = 'staff',
  SH_ADMIN = 'sh_admin',
}

export enum DashboardMetricsEnums {
  // conversion
  NEW_USERS = 'new_users',
  ACTIVATION_MILESTONE = 'activation_milestone',
  ACTIVATION_RATE = 'activation_rate',

  // engagement
  AVG_USER_ENGAGEMENT = 'avg_user_engagement',
  AVG_ACTIVITIES_PLAYED = 'avg_activities_played',
  ADOPTION_RATE = 'adoption_rate',

  // retention
  ACTIVE_USERS = 'active_users',
  TOTAL_ACTIVE_USERS = 'total_active_users',
  STICKINESS = 'stickiness',
}
