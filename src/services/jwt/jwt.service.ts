import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { User } from 'src/types/user';

@Injectable()
export class JwtService {
  constructor(private configService: ConfigService) {}

  generate(user: User) {
    const key = JSON.parse(this.configService.get('JWT_SECRET'));
    const payload = {
      firstName: user.firstName,
      lastName: user.lastName,
      id: user.id, // redundancy to make the reading easier
      provider: user.provider, // redundancy to make the reading easier
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['patient', 'therapist', 'admin'],
        'x-hasura-default-role': user.type,
        'x-hasura-user-id': user.id,
        'x-hasura-provider-id': user.provider,
      },
    };

    return jwt.sign(payload, key.key);
  }

  verify(header: string): any {
    const key = JSON.parse(this.configService.get('JWT_SECRET'));
    const token = header.replace('Bearer ', '');
    return jwt.verify(token, key.key);
  }
}
