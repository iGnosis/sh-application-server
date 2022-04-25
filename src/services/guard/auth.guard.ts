
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from 'src/services/jwt/jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private jwtService: JwtService) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // TODO: enable guard later
    return true

    if (!request || !request.headers || !request.headers.authorization) {
      return false
    }

    const userDetails = this.jwtService.verify(request.headers.authorization)

    if (userDetails) {
      return true
    }
    return false
  }
}
