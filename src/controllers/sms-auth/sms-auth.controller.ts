import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { Staff, Patient, ShAdmin, Organization } from 'src/types/global';
import { SMSLoginBody, SMSVerifyBody } from './sms-auth.dto';
import { SmsAuthService } from '../../services/sms-auth/sms-auth.service';
import { UserRole, LoginUserType } from 'src/common/enums/role.enum';
import { CreateOrganizationService } from 'src/services/organization/create/create-organization.service';

// TODO: Apply rate limiters (?)
@UseInterceptors(new TransformResponseInterceptor())
@Controller('sms-auth')
export class SmsAuthController {
  constructor(
    private smsAuthService: SmsAuthService,
    private createOrganizationService: CreateOrganizationService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(SmsAuthController.name);
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: SMSLoginBody,
    @Headers('x-pointmotion-user-type') userType: LoginUserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    // SH ADMIN does not require a Organization.
    if (userType !== LoginUserType.SH_ADMIN && !orgName) {
      throw new HttpException('Org name missing', HttpStatus.BAD_REQUEST);
    }

    if (
      !userType ||
      (userType !== LoginUserType.PATIENT &&
        userType !== LoginUserType.BENCHMARK &&
        userType !== LoginUserType.STAFF &&
        userType !== LoginUserType.SH_ADMIN)
    ) {
      throw new HttpException('Invalid userType', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();
    let user: Patient | Staff | ShAdmin;

    // TODO: cap the org admin sign-ups
    if (body.inviteCode) {
      const inviteObj = await this.createOrganizationService.verifyOrgInviteCode(body.inviteCode);
      if (inviteObj.expiryAt && new Date() > inviteObj.expiryAt) {
        throw new HttpException('Expired invite code', HttpStatus.UNAUTHORIZED);
      }
      await this.smsAuthService.insertStaff({
        phoneCountryCode: body.phoneCountryCode,
        phoneNumber: body.phoneNumber,
        organizationId: inviteObj.organizationId,
        type: UserRole.ORG_ADMIN,
      });
    }

    // NOTE: allow public patient signups.
    if (userType === LoginUserType.PATIENT) {
      const organization = await this.smsAuthService.getOrganization(orgName);
      try {
        await this.smsAuthService.insertPatient({
          phoneCountryCode: body.phoneCountryCode,
          phoneNumber: body.phoneNumber,
          organizationId: organization.id,
          type: UserRole.PATIENT,
        });
      } catch (error) {
        this.logger.log('patient might already exist');
      }
    }

    if (userType === LoginUserType.SH_ADMIN) {
      user = await this.smsAuthService.fetchShAdmin(phoneCountryCode, phoneNumber);
    } else if (userType === LoginUserType.STAFF) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === LoginUserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === LoginUserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
      if (!user || !user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    await this.smsAuthService.insertOtp(userType, user.id, otp);
    await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
    if (user && user.email) {
      this.logger.log(`sending Login OTP email to ${user.email}`);
      await this.smsAuthService.sendOtpEmail(user.email, otp);
    }
    return {
      message: 'OTP sent successfully.',
      isExistingUser: user && user.email ? true : false,
    };
  }

  @Post('resend-otp')
  async resendOtp(
    @Body() body: SMSLoginBody,
    @Headers('x-pointmotion-user-type') userType: LoginUserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    // SH ADMIN does not require a Organization.
    if (userType !== LoginUserType.SH_ADMIN && !orgName) {
      throw new HttpException('Org name missing', HttpStatus.BAD_REQUEST);
    }

    if (
      !userType ||
      (userType !== LoginUserType.PATIENT &&
        userType !== LoginUserType.BENCHMARK &&
        userType !== LoginUserType.STAFF &&
        userType !== LoginUserType.SH_ADMIN)
    ) {
      throw new HttpException('Invalid userType', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;

    let user: Staff | Patient | ShAdmin;
    if (userType === LoginUserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === LoginUserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userType === LoginUserType.SH_ADMIN) {
      user = await this.smsAuthService.fetchShAdmin(phoneCountryCode, phoneNumber);
    } else if (userType === LoginUserType.STAFF) {
      // only the phone numbers added to the staff table should be allowed to enter the Organization portal.
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    }

    if (!user) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const auth = await this.smsAuthService.fetchLatestOtp(userType, user.id);
    const isOtpExpired = this.smsAuthService.isOtpExpired(auth.expiryAt);
    const otp = isOtpExpired ? this.smsAuthService.generateOtp() : auth.otp;

    if (isOtpExpired) {
      await this.smsAuthService.insertOtp(userType, user.id, otp);
    }

    await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
    if (user && user.email) {
      this.logger.log(`sending resend OTP email to ${user.email}`);
      await this.smsAuthService.sendOtpEmail(user.email, otp);
    }
    return {
      message: 'OTP sent successfully.',
      isExistingUser: user && user.email ? true : false,
    };
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: SMSVerifyBody,
    @Headers('x-pointmotion-user-type') userType: LoginUserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    // SH ADMIN does not require a Organization.
    if (userType !== LoginUserType.SH_ADMIN && !orgName) {
      throw new HttpException('Org name missing', HttpStatus.BAD_REQUEST);
    }

    if (
      !userType ||
      (userType !== LoginUserType.PATIENT &&
        userType !== LoginUserType.BENCHMARK &&
        userType !== LoginUserType.STAFF &&
        userType !== LoginUserType.SH_ADMIN)
    ) {
      throw new HttpException('Invalid userType', HttpStatus.BAD_REQUEST);
    }

    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;
    let user: Staff | Patient | ShAdmin;

    if (userType === LoginUserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === LoginUserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userType === LoginUserType.SH_ADMIN) {
      user = await this.smsAuthService.fetchShAdmin(phoneCountryCode, phoneNumber);
    } else if (userType === LoginUserType.STAFF) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    }

    if (!user) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const auth = await this.smsAuthService.fetchLatestOtp(userType, user.id);
    const isExpired = this.smsAuthService.isOtpExpired(auth.expiryAt);

    if (isExpired || recievedOtp !== auth.otp) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // so that the same OTP can't be used twice.
    const tempOtp = this.smsAuthService.generateOtp();
    await this.smsAuthService.insertOtp(userType, user.id, tempOtp);

    const token = this.smsAuthService.generateJwtToken(userType, user);
    return { token };
  }
}
