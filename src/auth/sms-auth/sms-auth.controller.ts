import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import { Patient } from 'src/types/patient';
import { User } from 'src/types/user';
import { SMSLoginBody, SMSVerifyBody } from './sms-auth.dto';
import { SmsAuthService } from './sms-auth.service';

// TODO: Apply rate limiters (?)
@UseInterceptors(new TransformResponseInterceptor())
@Controller('sms-auth')
export class SmsAuthController {
  constructor(private smsAuthService: SmsAuthService) {}

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: SMSLoginBody, @Headers('x-pointmotion-user') userRole: string) {
    if (
      !userRole ||
      (userRole !== 'patient' && userRole !== 'therapist' && userRole !== 'tester')
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();

    // only the phone numbers added to the user table should be allowed to enter the provider portal.
    if (userRole === 'therapist') {
      await this.smsAuthService.fetchTherapist(phoneCountryCode, phoneNumber).catch(() => {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      });
    } else if (userRole === 'tester') {
      // Only patients having `isTester` set are allowed to login.
      const patient = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
      if (!patient.isTester) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    await this.smsAuthService.insertUser(userRole, phoneCountryCode, phoneNumber);
    await this.smsAuthService.updateUserOtp(userRole, phoneCountryCode, phoneNumber, otp);
    await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
    return {
      message: 'OTP sent successfully.',
      // otp: otp,
    };
  }

  @Post('resend-otp')
  async resendOtp(@Body() body: SMSLoginBody, @Headers('x-pointmotion-user') userRole: string) {
    if (
      !userRole ||
      (userRole !== 'patient' && userRole !== 'therapist' && userRole !== 'tester')
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;

    let user: User | Patient;
    if (userRole === 'patient') {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    } else if (userRole === 'tester') {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
      if (!user.isTester) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userRole === 'therapist') {
      // only the phone numbers added to the user table should be allowed to enter the provider portal.
      user = await this.smsAuthService.fetchTherapist(phoneCountryCode, phoneNumber).catch(() => {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      });
    }

    // If OTP is not expired, send the same OTP and update issued at time.
    const isOtpExpired = this.smsAuthService.isOtpExpired(user.auth.issuedAt);
    const otp = isOtpExpired ? this.smsAuthService.generateOtp() : user.auth.otp;

    if (isOtpExpired) {
      await this.smsAuthService.updateUserOtp(userRole, phoneCountryCode, phoneNumber, otp);
    }

    await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
    return {
      message: 'OTP sent successfully.',
      // otp: otp,
    };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: SMSVerifyBody, @Headers('x-pointmotion-user') userRole: string) {
    if (
      !userRole ||
      (userRole !== 'patient' && userRole !== 'therapist' && userRole !== 'tester')
    ) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;
    let user: User | Patient;
    if (userRole === 'patient') {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    } else if (userRole === 'tester') {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
      if (!user.isTester) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userRole === 'therapist') {
      user = await this.smsAuthService.fetchTherapist(phoneCountryCode, phoneNumber);
    }

    // check if OTP has been expired.
    const isExpired = this.smsAuthService.isOtpExpired(user.auth.issuedAt);
    if (isExpired) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // check if OTP is correct or not.
    if (recievedOtp !== user.auth.otp) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }
    // so that same OTP can't be used twice.
    const tempOtp = this.smsAuthService.generateOtp();
    await this.smsAuthService.updateUserOtp(userRole, phoneCountryCode, phoneNumber, tempOtp);

    // generate JWT - 24hrs validity.
    const token = this.smsAuthService.generateJwtToken(userRole, user);

    return {
      token,
    };
  }
}
