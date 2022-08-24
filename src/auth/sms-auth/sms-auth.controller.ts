import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import { SMSLoginBody, SMSVerifyBody } from './sms-auth.dto';
import { SmsAuthService } from './sms-auth.service';

// TODO: Apply rate limiters (?)
@UseInterceptors(new TransformResponseInterceptor())
@Controller('sms-auth')
export class SmsAuthController {
  constructor(private smsAuthService: SmsAuthService) {}

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: SMSLoginBody) {
    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();
    await this.smsAuthService.insertPatient(phoneCountryCode, phoneNumber);
    await this.smsAuthService.updatePatientOtp(phoneCountryCode, phoneNumber, otp);
    await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
    return {
      message: 'OTP sent successfully.',
      // otp: otp,
    };
  }

  @Post('resend-otp')
  async resendOtp(@Body() body: SMSLoginBody) {
    const { phoneCountryCode, phoneNumber } = body;
    const patient = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    console.log('resendOtp:patient:', patient);

    // If OTP is not expired, send the same OTP and update issued at time.
    const isOtpExpired = this.smsAuthService.isOtpExpired(patient.auth.issuedAt);
    const otp = isOtpExpired ? this.smsAuthService.generateOtp() : patient.auth.otp;

    if (isOtpExpired) {
      await this.smsAuthService.updatePatientOtp(phoneCountryCode, phoneNumber, otp);
    }

    await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
    return {
      message: 'OTP sent successfully.',
      // otp: otp,
    };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: SMSVerifyBody) {
    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;

    const patient = await this.smsAuthService.fetchPatient(phoneCountryCode, phoneNumber);
    console.log('verifyOtp:patient:', patient);

    // check if OTP has been expired.
    const isExpired = this.smsAuthService.isOtpExpired(patient.auth.issuedAt);
    if (isExpired) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // check if OTP is correct or not.
    if (recievedOtp !== patient.auth.otp) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }
    // so that same OTP can't be used twice.
    const tempOtp = this.smsAuthService.generateOtp();
    await this.smsAuthService.updatePatientOtp(phoneCountryCode, phoneNumber, tempOtp);

    // generate JWT - 24hrs validity.
    const token = this.smsAuthService.generateJwtToken(patient);

    return {
      token,
    };
  }
}
