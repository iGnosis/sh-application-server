import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Auth0Service } from '../auth0/auth0.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth0Service: Auth0Service) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request || !request.headers || !request.headers.authorization) {
      throw new HttpException('User not logged in', HttpStatus.FORBIDDEN);
    }

    const token = request.headers.authorization.replace('Bearer ', '');
    const userDetails = await this.auth0Service.verifyToken(token);

    if (!userDetails) {
      throw new HttpException('User not logged in', HttpStatus.FORBIDDEN);
    }

    // console.dir(userDetails, { depth: null })
    request.user = userDetails;
    return true;
  }
}
