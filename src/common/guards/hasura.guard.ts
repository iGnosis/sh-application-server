import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { join } from 'path';
import { Observable } from 'rxjs';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { UserRole } from '../../types/enums/enum';

@Injectable()
export class HasuraGuard implements CanActivate {
  constructor(private config: ConfigService, private smsAuthService: SmsAuthService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const routePath = request.route.path;
    // console.log('request:routePath:', routePath);

    // Read from cache manager.
    const downloadsDir = join(process.cwd(), 'storage/hasura-metadata');
    const controllersMetadataFilePath = join(downloadsDir, `gql-controllers.json`);
    const rawData = fs.readFileSync(controllersMetadataFilePath, { encoding: 'utf-8' });

    const hasuraRbac = JSON.parse(rawData);
    // console.log('hasuraRbac: ', hasuraRbac);

    hasuraRbac.eventTrigger.forEach((eventTrigger) => {
      if (eventTrigger.fullUrl === routePath) {
        // console.log('eventTrigger:', eventTrigger);
        if (
          !request ||
          !request.headers ||
          !request.headers['x-hasura-admin-secret'] ||
          request.headers['x-hasura-admin-secret'] !== this.config.get('GQL_API_ADMIN_SECRET')
        ) {
          throw new HttpException('Invalid admin secret', HttpStatus.FORBIDDEN);
        }
      }
      return true;
    });

    hasuraRbac.actions.forEach((action) => {
      if (action.fullUrl === routePath) {
        console.log('gql:action:', action);

        if (
          action.roles.length === 0 ||
          (action.roles.length === 1 && action.roles.includes(UserRole.GUEST))
        ) {
          return true;
        }

        if (!request || !request.headers || !request.headers.authorization) {
          throw new HttpException('Authorization header missing', HttpStatus.FORBIDDEN);
        }

        const token = request.headers.authorization.replace('Bearer ', '');
        const userDetails = this.smsAuthService.verifyToken(token);
        if (!userDetails) {
          throw new HttpException('User not logged in', HttpStatus.FORBIDDEN);
        }

        const userRole = userDetails['https://hasura.io/jwt/claims']['x-hasura-default-role'];
        if (action.roles.includes(userRole)) {
          request.user = userDetails;
          return true;
        }
        throw new HttpException('Insufficient privileges', HttpStatus.FORBIDDEN);
      }
    });

    // if route not in actions nor in event trigger.
    return true;
  }
}
