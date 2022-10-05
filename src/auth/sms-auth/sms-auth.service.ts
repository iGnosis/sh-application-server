import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { GqlService } from 'src/services/gql/gql.service';
import * as jwt from 'jsonwebtoken';
import { Patient } from 'src/types/patient';
import { SmsService } from 'src/services/sms/sms.service';
import { IsArray } from 'class-validator';
import { User } from 'src/types/user';

@Injectable()
export class SmsAuthService {
  constructor(
    private gqlService: GqlService,
    private configService: ConfigService,
    private smsService: SmsService,
  ) {}

  // generates a 6 digit random number.
  generateOtp() {
    return randomInt(100000, 1000000);
  }

  isOtpExpired(issuedAt: number) {
    const now = new Date().getTime();
    const diffInMins = (now - issuedAt) / 1000 / 60;

    // OTP remains valid for 30mins from the time it is issued.
    if (diffInMins < 30) {
      return false;
    }
    return true;
  }

  async sendOtp(phoneCountryCode: string, phoneNumber: string, otp: number) {
    this.smsService.client.messages.create({
      from: this.configService.get('TWILIO_PHONE_NUMBER'),
      to: `${phoneCountryCode}${phoneNumber}`,
      body: `Your PointMotion OTP is ${otp}`,
    });
  }

  async fetchPatient(phoneCountryCode: string, phoneNumber: string): Promise<Patient> {
    const query = `
      query FetchPatient($phoneCountryCode: String!, $phoneNumber: String!) {
        patient(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}}) {
          id
          isTester
          auth
        }
      }`;

    const resp = await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber });

    if (!resp || !IsArray(resp.patient) || !resp.patient.length) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    return resp.patient[0];
  }

  async fetchTherapist(phoneCountryCode: string, phoneNumber: string): Promise<User> {
    const query = `
     query FetchUser($phoneCountryCode: String!, $phoneNumber: String!) {
        user(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}, type: {_eq: therapist}}) {
          auth
          id
        }
      }`;

    const resp = await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber });

    if (!resp || !IsArray(resp.user) || !resp.user.length) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    return resp.user[0];
  }

  async insertUser(userRole: string, phoneCountryCode: string, phoneNumber: string) {
    let query = `
      mutation InsertPatient($phoneCountryCode: String!, $phoneNumber: String!) {
        insert_patient(objects: {phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber}) {
          affected_rows
        }
      }`;

    if (userRole === 'therapist') {
      query = `mutation InsertTherapist($phoneCountryCode: String!, $phoneNumber: String!) {
        insert_user(objects: {phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber, type: therapist}) {
            affected_rows
        }
      }`;
    }

    try {
      await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber: phoneNumber });
    } catch (err) {
      // user might already exist.
      console.log('insertUser:err', err);
    }
  }

  async updateUserOtp(
    userRole: string,
    phoneCountryCode: string,
    phoneNumber: string,
    otp: number,
  ) {
    let updateOtpQuery = `
      mutation UpdateOTP($phoneCountryCode: String!, $phoneNumber: String!, $auth: jsonb!) {
        update_patient(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}}, _set: {auth: $auth}) {
          affected_rows
        }
      }`;

    if (userRole === 'therapist') {
      updateOtpQuery = `
        mutation UpdateUserOTP($phoneCountryCode: String!, $phoneNumber: String!, $auth: jsonb!) {
          update_user(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}, type: {_eq: therapist}}, _set: {auth: $auth}) {
            affected_rows
          }
        }`;
    }

    try {
      await this.gqlService.client.request(updateOtpQuery, {
        phoneCountryCode,
        phoneNumber,
        auth: {
          otp,
          issuedAt: new Date().getTime(),
        },
      });
    } catch (err) {
      console.log('updatePatientOtp:err', err);
    }
  }

  generateJwtToken(userRole: 'patient' | 'therapist' | 'tester', user: Patient | User) {
    const key = JSON.parse(this.configService.get('JWT_SECRET'));

    // JWT token remains valid for 30 days.
    const expOffset = 60 * 60 * 24 * 30;

    // issued at in seconds (as per JWT standards).
    const iat = parseInt(`${new Date().getTime() / 1000}`);

    // expiry at in seconds (as per JWT standards).
    const exp = iat + expOffset;

    const payload = {
      id: user.id,
      iat,
      exp,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': [userRole],
        'x-hasura-default-role': userRole,
        'x-hasura-user-id': user.id,
      },
    };
    return jwt.sign(payload, key.key);
  }

  verifyToken(token: string) {
    const key = JSON.parse(this.configService.get('JWT_SECRET'));
    try {
      const decodedToken = jwt.verify(token, key.key);
      return decodedToken;
    } catch (error) {
      throw new HttpException('Invalid Token', HttpStatus.FORBIDDEN);
    }
  }
}
