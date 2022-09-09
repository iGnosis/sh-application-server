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
  phoneCountryCode: string;
  phoneNumber: string;
  auth: {
    otp: number;
    issuedAt: number;
  };
}

export interface UserObjDecorator {
  'https://hasura.io/jwt/claims': HasuraClaims;
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  exp: number;
  azp: string;
  scope: string;
}

interface HasuraClaims {
  'x-hasura-allowed-roles': Array<string>;
  'x-hasura-user-id': string;
  'x-hasura-default-role': string;
  'x-hasura-provider-id': string;
  'x-hasura-careplan-id': string;
}
