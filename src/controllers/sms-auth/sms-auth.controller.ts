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
import { Staff, Patient } from 'src/types/global';
import { SMSLoginBody, SMSVerifyBody } from './sms-auth.dto';
import { SmsAuthService } from '../../services/sms-auth/sms-auth.service';
import { UserRole, UserType } from 'src/common/enums/role.enum';
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
    @Headers('x-pointmotion-user-type') userType: UserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    if (
      !orgName ||
      !userType ||
      (userType !== UserType.PATIENT &&
        userType !== UserType.BENCHMARK &&
        userType !== UserType.STAFF)
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();
    let user: Patient | Staff;

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

    if (userType === UserType.STAFF) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === UserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === UserType.BENCHMARK) {
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
    @Headers('x-pointmotion-user-type') userType: UserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    if (
      !orgName ||
      !userType ||
      (userType !== UserType.PATIENT &&
        userType !== UserType.BENCHMARK &&
        userType !== UserType.STAFF)
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;

    let user: Staff | Patient;
    if (userType === UserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === UserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userType === UserType.STAFF) {
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
    @Headers('x-pointmotion-user-type') userType: UserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    if (
      !orgName ||
      !userType ||
      (userType !== UserType.PATIENT &&
        userType !== UserType.STAFF &&
        userType !== UserType.BENCHMARK)
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;
    let user: Staff | Patient;

    if (userType === UserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === UserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber, orgName);
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userType === UserType.STAFF) {
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
