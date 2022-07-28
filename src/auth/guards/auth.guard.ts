import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { CognitoService } from '../cognito/cognito.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private cognitoService: CognitoService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // TODO: Revert this change.
    // Bypass auth checks until Verifier is ready.
    return true;

    if (!request || !request.headers || !request.headers.authorization) {
      return false;
    }

    const token = request.headers.authorization.replace('Bearer ', '');
    const userDetails = this.cognitoService.verifyIdToken(token);

    if (!userDetails) {
      return false;
    }

    // console.dir(userDetails, { depth: null })
    request.user = userDetails;
    return true;
  }
}
