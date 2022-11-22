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
import { UserRole } from 'src/common/enums/role.enum';

// TODO: Apply rate limiters (?)
@UseInterceptors(new TransformResponseInterceptor())
@Controller('sms-auth')
export class SmsAuthController {
  constructor(private smsAuthService: SmsAuthService, private readonly logger: Logger) {
    this.logger = new Logger(SmsAuthController.name);
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: SMSLoginBody, @Headers('x-pointmotion-user') userRole: UserRole) {
    if (
      !userRole ||
      (userRole !== UserRole.PATIENT &&
        userRole !== UserRole.THERAPIST &&
        userRole !== UserRole.BENCHMARK &&
        userRole !== UserRole.ORG_ADMIN &&
        userRole !== UserRole.SH_ADMIN)
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();
    let user: Patient | Staff;

    // only the phone numbers added to the user table should be allowed to enter the provider portal.
    if (
      userRole === UserRole.THERAPIST ||
      userRole === UserRole.ORG_ADMIN ||
      userRole === UserRole.SH_ADMIN
    ) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber);
    } else if (userRole === UserRole.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    } else if (userRole === UserRole.BENCHMARK) {
      // Only patients having `canBenchmark` set are allowed to login.
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
      if (!user || !user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    // TODO: patient sign-ups will depend on the type of organization configs.
    if (userRole === UserRole.PATIENT) {
      await this.smsAuthService.insertPatient(phoneCountryCode, phoneNumber);
    }

    await this.smsAuthService.insertOtp(userRole, user.id, otp);
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
    @Headers('x-pointmotion-user') userRole: UserRole,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (
      !userRole ||
      (userRole !== UserRole.PATIENT &&
        userRole !== UserRole.THERAPIST &&
        userRole !== UserRole.BENCHMARK)
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;

    let user: Staff | Patient;
    if (userRole === UserRole.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    } else if (userRole === UserRole.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userRole === UserRole.THERAPIST) {
      // only the phone numbers added to the user table should be allowed to enter the provider portal.
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber).catch(() => {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      });
    }

    if (!user) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    // If OTP is not expired, send the same OTP.
    const auth = await this.smsAuthService.fetchLatestOtp(userRole, user.id);
    const isOtpExpired = this.smsAuthService.isOtpExpired(auth.expiryAt);
    const otp = isOtpExpired ? this.smsAuthService.generateOtp() : auth.otp;

    if (isOtpExpired) {
      await this.smsAuthService.insertOtp(userRole, user.id, otp);
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
    @Headers('x-pointmotion-user') userRole: UserRole,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (
      !userRole ||
      (userRole !== UserRole.PATIENT &&
        userRole !== UserRole.THERAPIST &&
        userRole !== UserRole.BENCHMARK)
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;
    let user: Staff | Patient;
    if (userRole === UserRole.PATIENT) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    } else if (userRole === UserRole.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userRole === UserRole.THERAPIST) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber);
    }

    if (!user) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const auth = await this.smsAuthService.fetchLatestOtp(userRole, user.id);
    const isExpired = this.smsAuthService.isOtpExpired(auth.expiryAt);

    if (isExpired) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // check if OTP is correct or not.
    if (recievedOtp !== auth.otp) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }
    // so that the same OTP can't be used twice.
    const tempOtp = this.smsAuthService.generateOtp();
    await this.smsAuthService.insertOtp(userRole, user.id, tempOtp);

    const token = this.smsAuthService.generateJwtToken(userRole, user);
    return {
      token,
    };
  }
}
