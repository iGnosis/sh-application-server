import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { GqlService } from 'src/services/clients/gql/gql.service';
import * as jwt from 'jsonwebtoken';
import { Patient } from 'src/types/patient';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { Staff } from 'src/types/user';
import { EmailService } from '../clients/email/email.service';
import { Email } from 'src/types/email';
import { UserRole } from 'src/common/enums/role.enum';
import { Auth } from 'src/types/global';

@Injectable()
export class SmsAuthService {
  constructor(
    private gqlService: GqlService,
    private configService: ConfigService,
    private smsService: SmsService,
    private emailService: EmailService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(SmsAuthService.name);
  }

  generateOtp() {
    // returns 6 digit random number
    return randomInt(100000, 1000000);
  }

  isOtpExpired(expiryAt: Date) {
    const now = new Date();
    if (now > expiryAt) {
      return true;
    }
    return false;
  }

  async sendOtp(phoneCountryCode: string, phoneNumber: string, otp: number) {
    try {
      await this.smsService.client.messages.create({
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        to: `${phoneCountryCode}${phoneNumber}`,
        body: `Your PointMotion OTP is ${otp}`,
      });
    } catch (err) {
      this.logger.error('sendOtp: ', JSON.stringify(err));
      throw new HttpException(
        'Unexpected error occurred while sending OTP via SMS',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendOtpEmail(patientEmail: string, otp: number) {
    try {
      const email: Email = {
        to: [patientEmail],
        subject: 'Your Pointmotion OTP',
        body: `<h2>Your Pointmotion OTP is ${otp}<h2>`,
        text: '', // doesn't matter if its empty.
      };
      return await this.emailService.send(email);
    } catch (err) {
      this.logger.error('sendOtpEmail: ', JSON.stringify(err));
    }
  }

  async fetchPatient(phoneCountryCode: string, phoneNumber: string): Promise<Patient> {
    const query = `
      query FetchPatient($phoneCountryCode: String!, $phoneNumber: String!) {
        patient(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}}) {
          id
          canBenchmark
          email
        }
      }`;

    const resp = await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber });
    return resp.patient[0];
  }

  async fetchStaff(phoneCountryCode: string, phoneNumber: string): Promise<Staff> {
    const query = `
     query FetchStaff($phoneCountryCode: String!, $phoneNumber: String!) {
        staff(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}, type: {_eq: therapist}}) {
          id
        }
      }`;

    try {
      const resp = await this.gqlService.client.request(query, { phoneCountryCode, phoneNumber });
      console.log('fetchStaff:resp:', resp);
      return resp.staff[0];
    } catch (err) {
      console.log(err);
      throw new HttpException('Bad Request', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async fetchStaffLatestOtp(staff: string): Promise<Auth> {
    const query = `query GetLatestStaggOtp($staff: uuid!) {
      auth(where: {staff: {_eq: $staff}}, limit: 1, order_by: {createdAt: desc}) {
        id
        createdAt
        expiryAt
        otp
        staff
        patient
      }
    }`;
    const resp = await this.gqlService.client.request(query, { staff });
    return resp.auth[0];
  }

  private async fetchPatientLatestOtp(patient: string): Promise<Auth> {
    const query = `query GetLatestPatientOtp($patient: uuid!) {
      auth(where: {patient: {_eq: $patient}}, limit: 1, order_by: {createdAt: desc}) {
        id
        createdAt
        expiryAt
        otp
        staff
        patient
      }
    }`;
    const resp = await this.gqlService.client.request(query, { patient });
    return resp.auth[0];
  }

  async fetchLatestOtp(userRole: UserRole, userId: string) {
    let auth: Auth;
    if (userRole === UserRole.PATIENT || userRole === UserRole.BENCHMARK) {
      auth = await this.fetchPatientLatestOtp(userId);
    } else if (userRole === UserRole.THERAPIST) {
      auth = await this.fetchStaffLatestOtp(userId);
    }
    return auth;
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
      this.logger.error('insertUser: ' + JSON.stringify(err));
    }
  }

  async insertOtp(userRole: UserRole, userId: string, otp: number) {
    const query = `mutation InsertOtp($patient: uuid = null, $staff: uuid = null, $otp: Int!, $expiryAt: timestamptz!) {
      insert_auth(objects: {patient: $patient, staff: $staff, otp: $otp, expiryAt: $expiryAt}) {
        affected_rows
      }
    }`;

    // otp remains valid for 30 minutes
    const expiryAtMins = 30;
    const expiryAt = new Date(new Date().getTime() + 1000 * 60 * expiryAtMins).toISOString();

    try {
      await this.gqlService.client.request(query, {
        patient: userRole === UserRole.PATIENT || userRole === UserRole.BENCHMARK ? userId : null,
        staff: userRole === UserRole.THERAPIST ? userId : null,
        otp,
        expiryAt,
      });
    } catch (err) {
      console.log(err);
      throw new HttpException('[Login API] Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  generateJwtToken(
    userRole: 'patient' | 'therapist' | 'benchmark',
    user: Patient | Staff,
    jwtSecret?: string,
  ) {
    if (!jwtSecret) {
      jwtSecret = this.configService.get('JWT_SECRET');
    }

    const key = JSON.parse(jwtSecret);

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

  verifyToken(token: string, jwtSecret?: string) {
    if (!jwtSecret) {
      jwtSecret = this.configService.get('JWT_SECRET');
    }
    const key = JSON.parse(jwtSecret);
    try {
      const decodedToken = jwt.verify(token, key.key);
      return decodedToken;
    } catch (error) {
      throw new HttpException('Invalid Token', HttpStatus.FORBIDDEN);
    }
  }
}
