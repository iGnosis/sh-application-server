import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { GqlService } from 'src/services/gql/gql.service';
import * as jwt from 'jsonwebtoken';
import { Patient } from 'src/types/patient';
import { SmsService } from 'src/services/sms/sms.service';
import { IsArray } from 'class-validator';

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
          auth
        }
      }`;

    const resp = await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber });

    if (!resp || !IsArray(resp.patient) || !resp.patient.length) {
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }

    return resp.patient[0];
  }

  async insertPatient(phoneCountryCode: string, phoneNumber: string) {
    const query = `
      mutation InsertPatient($phoneCountryCode: String!, $phoneNumber: String!) {
        insert_patient(objects: {phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber}) {
          affected_rows
        }
      }`;

    try {
      await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber: phoneNumber });
    } catch (err) {
      // user might already exist.
      console.log('insertPatient:err', err);
    }
  }

  async updatePatientOtp(phoneCountryCode: string, phoneNumber: string, otp: number) {
    const updateOtpQuery = `
      mutation UpdateOTP($phoneCountryCode: String!, $phoneNumber: String!, $auth: jsonb!) {
        update_patient(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}}, _set: {auth: $auth}) {
          affected_rows
        }
      }`;

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

  generateJwtToken(patient: Patient) {
    const key = JSON.parse(this.configService.get('JWT_SECRET'));

    // JWT token remains valid for 24 hours.
    const expOffset = 60 * 60 * 24;

    // issued at in seconds (as per JWT standards).
    const iat = parseInt(`${new Date().getTime() / 1000}`);

    // issued at in seconds (as per JWT standards).
    const exp = iat + expOffset;

    const payload = {
      id: patient.id,
      iat,
      exp,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['patient', 'therapist', 'admin'],
        'x-hasura-default-role': 'patient',
        'x-hasura-user-id': patient.id,

        // [DEPRECATED] - default careplans & providers.
        'x-hasura-provider-id': '00000000-0000-0000-0000-000000000000',
        'x-hasura-careplan-id': '4319023a-a24b-4d19-af82-be92d14f09de',
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
