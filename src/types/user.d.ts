export class User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
  firstName: string;
  lastName: string;
  type: string;
  status: string;
  provider: string;
}

export interface UserObjDecorator {
  sub: string;
  email_verified: boolean;
  'https://hasura.io/jwt/claims': string;
  iss: string;
  'cognito:username': string;
  origin_jti: string;
  aud: string;
  event_id: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email: string;
  hasuraClaims: HasuraClaims;
}

interface HasuraClaims {
  'x-hasura-allowed-roles': Array<string>;
  'x-hasura-user-id': string;
  'x-hasura-default-role': string;
  'x-hasura-provider-id': string;
  'x-hasura-careplan-id': string;
}
