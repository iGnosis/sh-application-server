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
    if (!userRole || (userRole !== 'patient' && userRole !== 'therapist'))
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);

    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();
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
    if (!userRole || (userRole !== 'patient' && userRole !== 'therapist'))
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);

    const { phoneCountryCode, phoneNumber } = body;
    const patient = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    console.log('resendOtp:patient:', patient);

    // If OTP is not expired, send the same OTP and update issued at time.
    const isOtpExpired = this.smsAuthService.isOtpExpired(patient.auth.issuedAt);
    const otp = isOtpExpired ? this.smsAuthService.generateOtp() : patient.auth.otp;

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
    if (!userRole || (userRole !== 'patient' && userRole !== 'therapist'))
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);

    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;
    let user: User | Patient;
    if (userRole === 'patient') {
      user = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    } else if (userRole === 'therapist') {
      user = await this.smsAuthService.fetchTherapist(phoneCountryCode, phoneNumber);
    }
    console.log('verifyOtp:user:', user);

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
