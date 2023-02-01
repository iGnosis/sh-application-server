import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SmsAuthService } from '../../services/sms-auth/sms-auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private smsAuthService: SmsAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request || !request.headers || !request.headers.authorization) {
      throw new HttpException('User not logged in', HttpStatus.FORBIDDEN);
    }

    const token = request.headers.authorization.replace('Bearer ', '');
    const userDetails = this.smsAuthService.verifyToken(token);

    if (!userDetails) {
      throw new HttpException('User not logged in', HttpStatus.FORBIDDEN);
    }

    // console.dir(userDetails, { depth: null })
    request.user = userDetails;
    return true;
  }
}
