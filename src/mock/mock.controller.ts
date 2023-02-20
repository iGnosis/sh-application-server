import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { UserRole, LoginUserType } from 'src/common/enums/enum';
import { CreateTestJwtBody } from './mock-controller.dto';

@Controller('mock')
@UseInterceptors(new TransformResponseInterceptor())
export class MockController {
  constructor(private configService: ConfigService, private smsAuthService: SmsAuthService) {}

  @Get('auth/staff')
  async createTestJwt(@Query() body: CreateTestJwtBody) {
    const allowedEnvs = ['local', 'development'];
    if (!allowedEnvs.includes(this.configService.get('ENV_NAME'))) {
      throw new HttpException('Operation Not Allowed', HttpStatus.FORBIDDEN);
    }

    const mockStaffRoles: {
      [key in UserRole]?: {
        phoneCountryCode: string;
        phoneNumber: string;
        orgName: string;
      };
    } = {
      therapist: {
        phoneCountryCode: '+00',
        phoneNumber: '0000000000',
        orgName: 'pointmotion',
      },
      org_admin: {
        phoneCountryCode: '+00',
        phoneNumber: '0000000001',
        orgName: 'pointmotion',
      },
      sh_admin: {
        phoneCountryCode: '+00',
        phoneNumber: '0000000002',
        orgName: 'pointmotion',
      },
    };

    if (!Object.keys(mockStaffRoles).includes(body.userRole)) {
      throw new HttpException('Invalid test user role.', HttpStatus.FORBIDDEN);
    }

    const { phoneCountryCode, phoneNumber, orgName } = mockStaffRoles[body.userRole];
    const user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    const jwt = this.smsAuthService.generateJwtToken('staff' as LoginUserType, user);
    return { jwt };
  }
}
