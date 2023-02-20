import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from 'src/common/enums/enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    // console.dir(user, { depth: null })

    const hasuraCliams = user['https://hasura.io/jwt/claims'];
    const userRole = hasuraCliams['x-hasura-default-role'];

    // console.log('requiredRoles: ', requiredRoles);
    // console.log('userRole: ', userRole);
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    throw new HttpException('Insufficient privileges', HttpStatus.FORBIDDEN);
  }
}
