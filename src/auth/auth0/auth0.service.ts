import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode, verify } from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

@Injectable()
export class Auth0Service {
  jwksClient: jwksClient.JwksClient;
  constructor(private configService: ConfigService) {
    this.jwksClient = jwksClient({
      jwksUri: `${this.configService.get('AUTH0_DOMAIN')}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }
  async verifyToken(token: string) {
    try {
      const jwt = decode(token, {
        complete: true,
      });
      if (!jwt.header.kid) {
        throw new Error('Unable to find kid in header.');
      }
      const signingKey = await this.jwksClient.getSigningKey(jwt.header.kid);
      const publicKey = signingKey.getPublicKey();

      console.log('publicKey:: ', publicKey);

      return verify(token, publicKey, {
        algorithms: ['RS256'],
        audience: this.configService.get('AUTH0_AUDIENCE'),
        issuer: this.configService.get('AUTH0_ISSUER'),
      });
    } catch (error) {
      console.log('Invalid token:error:', error);
      throw new HttpException('Invalid Token', HttpStatus.BAD_REQUEST);
    }
  }
}
