import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { GqlService } from 'src/services/clients/gql/gql.service';
import * as jwt from 'jsonwebtoken';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { Staff, Patient } from 'src/types/global';
import { EmailService } from '../clients/email/email.service';
import { Email, Auth, JwtPayload } from 'src/types/global';
import { isArray } from 'lodash';
import { UserType } from 'src/common/enums/role.enum';

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

  async fetchPatient(
    phoneCountryCode: string,
    phoneNumber: string,
    orgName: string,
  ): Promise<Patient> {
    const query = `query FetchPatient($phoneCountryCode: String!, $phoneNumber: String!, $orgName: String!) {
      patient(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}, organization: {name: {_eq: $orgName}}}) {
        id
        canBenchmark
        email
        organizationId
        organization {
          id
          createdAt
          name
          configuration
        }
      }
    }`;

    try {
      const resp = await this.gqlService.client.request(query, {
        phoneCountryCode,
        phoneNumber,
        orgName,
      });
      if (!resp || !resp.patient || !isArray(resp.patient) || !resp.patient.length) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      return resp.patient[0];
    } catch (err) {
      this.logger.error('error while calling fetchPatient' + JSON.stringify(err));
      throw new HttpException(
        'fetchPatient:Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchStaff(phoneCountryCode: string, phoneNumber: string, orgName: string): Promise<Staff> {
    const query = `query FetchStaff($phoneCountryCode: String!, $phoneNumber: String!, $orgName: String!) {
      staff(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}, organization: {name: {_eq: $orgName}}}) {
        id
        organizationId
        organization {
          id
          name
        }
        type
      }
    }`;

    try {
      const resp = await this.gqlService.client.request(query, {
        phoneCountryCode,
        phoneNumber,
        orgName,
      });
      if (!resp || !resp.staff || !isArray(resp.staff) || !resp.staff.length) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      return resp.staff[0];
    } catch (err) {
      this.logger.error('error while calling fetchStaff' + JSON.stringify(err));
      throw new HttpException('fetchStaff:Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
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

  async fetchLatestOtp(userType: UserType, userId: string) {
    let auth: Auth;
    if (userType === UserType.PATIENT || userType === UserType.BENCHMARK) {
      auth = await this.fetchPatientLatestOtp(userId);
    } else if (userType === UserType.STAFF) {
      auth = await this.fetchStaffLatestOtp(userId);
    }
    return auth;
  }

  async insertPatient(patientObj: Patient) {
    const query = `mutation InsertPatient($phoneCountryCode: String!, $phoneNumber: String!, $email: String = null, $namePrefix: String = null, $firstName: String = null, $lastName: String = null, $organizationId: uuid!) {
      insert_patient(objects: {phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber, email: $email, namePrefix: $namePrefix, firstName: $firstName, lastName: $lastName, organizationId: $organizationId}) {
        affected_rows
      }
    }`;

    const {
      phoneCountryCode,
      phoneNumber,
      namePrefix,
      firstName,
      lastName,
      email,
      organizationId,
    } = patientObj;

    try {
      await this.gqlService.client.request(query, {
        phoneCountryCode,
        phoneNumber: phoneNumber,
        namePrefix,
        firstName,
        lastName,
        email,
        organizationId,
      });
    } catch (err) {
      this.logger.error('insertUser: ' + JSON.stringify(err));
      throw new HttpException('Error while signing up patient', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async insertStaff(staffObj: Staff) {
    const query = `mutation InsertStaff($firstName: String!, $lastName: String!, $email: String!, $organizationId: uuid!, $phoneCountryCode: String!, $phoneNumber: String!, $type: user_type_enum!) {
      insert_staff_one(object: {firstName: $firstName, lastName: $lastName, email: $email, organizationId: $organizationId, phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber, type: $type}) {
        id
      }
    }`;
    try {
      await this.gqlService.client.request(query, staffObj);
    } catch (err) {
      this.logger.error('insertStaff: ' + JSON.stringify(err));
      throw new HttpException('Error while signing up Staff', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async insertOtp(userType: UserType, userId: string, otp: number) {
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
        patient: userType === UserType.PATIENT || userType === UserType.BENCHMARK ? userId : null,
        staff: userType === UserType.STAFF ? userId : null,
        otp,
        expiryAt,
      });
    } catch (err) {
      this.logger.error('error while calling insertOtp' + JSON.stringify(err));
      throw new HttpException('insertOtp:Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  generateJwtToken(userType: UserType, user: Patient | Staff, jwtSecret?: string) {
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

    const allowedRole =
      userType === UserType.PATIENT
        ? UserType.PATIENT
        : userType === UserType.BENCHMARK
        ? UserType.BENCHMARK
        : userType === UserType.STAFF && user.type
        ? user.type
        : null;

    let payload: JwtPayload = {
      id: user.id,
      iat,
      exp,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': [allowedRole],
        'x-hasura-default-role': allowedRole,
        'x-hasura-user-id': user.id,
      },
    };

    // Add Hasura custom fields
    payload = this.addCustomJwtId(userType, user, payload);
    return jwt.sign(payload, key.key);
  }

  addCustomJwtId(userType: UserType, user: Patient | Staff, jwtPayload: JwtPayload): JwtPayload {
    switch (userType) {
      case UserType.PATIENT:
      case UserType.STAFF:
        jwtPayload['https://hasura.io/jwt/claims']['x-hasura-organization-id'] =
          user.organizationId;
        break;
    }
    return jwtPayload;
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
