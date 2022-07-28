import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import jwtDecode from 'jwt-decode';
import { Auth0Service } from '../auth0/auth0.service';
import { CognitoService } from '../cognito/cognito.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth0Service: Auth0Service) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request || !request.headers || !request.headers.authorization) {
      return false;
    }

    const token = request.headers.authorization.replace('Bearer ', '');

    // TODO: Revert this change.
    // Bypass auth checks until Verifier is ready.
    // const userDetails = this.cognitoService.verifyIdToken(token);
    // const userDetails = jwtDecode(token);

    const userDetails = this.auth0Service.verifyToken(token);

    if (!userDetails) {
      return false;
    }

    // console.dir(userDetails, { depth: null })
    request.user = userDetails;
    return true;
  }
}
