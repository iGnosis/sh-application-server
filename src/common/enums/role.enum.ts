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
