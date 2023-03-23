import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { GqlService } from 'src/services/clients/gql/gql.service';
import * as jwt from 'jsonwebtoken';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { Staff, Patient, ShAdmin, Organization } from 'src/types/global';
import { EmailService } from '../clients/email/email.service';
import { Email, Auth, JwtPayload } from 'src/types/global';
import { isArray } from 'lodash';
import { LoginUserType } from 'src/types/enum';

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

  async getOrganization(orgName: string): Promise<Organization> {
    const query = `query GetOrganization($orgName: String!) {
      organization(where: {name: {_eq: $orgName}}) {
        id
        isPublicSignUpEnabled
      }
    }`;
    const resp = await this.gqlService.client.request(query, { orgName });
    return resp.organization[0];
  }

  async fetchPatient(
    phoneCountryCode: string,
    phoneNumber: string,
    orgName: string,
    orgId: string,
  ): Promise<Patient | undefined> {
    const getPatientHealthRecord = `query GetHealthRecords($jsonFilter: jsonb!, $organizationId: uuid!, $env: String!) {
      health_records(where: {recordType: {_eq: "phoneNumber"}, recordData: {_contains: $jsonFilter}, organizationId: {_eq: $organizationId}, env: {_eq: $env}}) {
        id
        recordData
      }
    }`;

    const patientHealthRecord = await this.gqlService.client.request(getPatientHealthRecord, {
      jsonFilter: {
        value: phoneNumber,
      },
      organizationId: orgId,
      env: this.configService.get('ENV_NAME'),
    });

    if (
      !patientHealthRecord ||
      !patientHealthRecord.health_records ||
      !Array.isArray(patientHealthRecord.health_records) ||
      !patientHealthRecord.health_records.length
    ) {
      return;
    }

    const query = `query FetchPatient($phoneCountryCode: String!, $phoneNumber: String!, $orgName: String!) {
      patient(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}, organization: {name: {_eq: $orgName}}}) {
        id
        canBenchmark
        phoneCountryCode
        phoneNumber: pii_phoneNumber(path: "value")
        email: pii_email(path: "value")
        organizationId
        organization {
          id
          createdAt
          name
          configuration
        }
      }
    }`;
    const resp = await this.gqlService.client.request(query, {
      phoneCountryCode,
      phoneNumber: patientHealthRecord.health_records[0].id,
      orgName,
    });
    if (!resp || !resp.patient || !isArray(resp.patient) || !resp.patient.length) {
      return;
    }
    return resp.patient[0];
  }

  async fetchShAdmin(phoneCountryCode: string, phoneNumber: string): Promise<ShAdmin> {
    const query = `query FetchShAdmin($phoneCountryCode: String!, $phoneNumber: String!) {
      sh_admin(where: {phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}}) {
        id
        createdAt
        updatedAt
        firstName
        lastName
        email
      }
    }`;
    const resp = await this.gqlService.client.request(query, {
      phoneCountryCode,
      phoneNumber,
    });
    if (!resp || !resp.sh_admin || !isArray(resp.sh_admin) || !resp.sh_admin.length) {
      throw new HttpException(
        {
          msg: 'Unauthorized',
          reason: 'Account does not exist.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return resp.sh_admin[0];
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

    const resp = await this.gqlService.client.request(query, {
      phoneCountryCode,
      phoneNumber,
      orgName,
    });
    if (!resp || !resp.staff || !isArray(resp.staff) || !resp.staff.length) {
      throw new HttpException(
        {
          msg: 'Unauthorized',
          reason: 'Account does not exist. Please ask your provider to create an account for you.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return resp.staff[0];
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

  private async fetchShAdminLatestOtp(userId: string): Promise<Auth> {
    const query = `query GetLatestPatientOtp($shAdmin: uuid!) {
      auth(where: {shAdmin: {_eq: $shAdmin}}, limit: 1, order_by: {createdAt: desc}) {
        id
        createdAt
        expiryAt
        otp
        shAdmin
      }
    }`;
    const resp = await this.gqlService.client.request(query, { shAdmin: userId });
    return resp.auth[0];
  }

  async fetchLatestOtp(userType: LoginUserType, userId: string) {
    let auth: Auth;
    if (userType === LoginUserType.PATIENT || userType === LoginUserType.BENCHMARK) {
      auth = await this.fetchPatientLatestOtp(userId);
    } else if (userType === LoginUserType.STAFF) {
      auth = await this.fetchStaffLatestOtp(userId);
    } else if (userType === LoginUserType.SH_ADMIN) {
      auth = await this.fetchShAdminLatestOtp(userId);
    }
    return auth;
  }

  async insertPatient(patientObj: Patient) {
    const query = `mutation InsertPatient($phoneCountryCode: String!, $phoneNumber: String!, $email: String = null, $namePrefix: String = null, $firstName: String = null, $lastName: String = null, $organizationId: uuid!) {
      insert_patient(objects: {phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber, email: $email, namePrefix: $namePrefix, firstName: $firstName, lastName: $lastName, organizationId: $organizationId}) {
        returning {
          id
        }
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
      const resp = await this.gqlService.client.request(query, {
        phoneCountryCode,
        phoneNumber: phoneNumber,
        namePrefix,
        firstName,
        lastName,
        email,
        organizationId,
      });
      return resp.insert_patient.returning;
    } catch (err) {
      this.logger.error('insertUser: ' + JSON.stringify(err));
      throw new HttpException('Error while signing up patient', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async insertStaff(staffObj: Staff) {
    const query = `mutation InsertStaff($firstName: String = "", $lastName: String = "", $email: String = "", $organizationId: uuid!, $phoneCountryCode: String!, $phoneNumber: String!, $type: user_type_enum!) {
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

  async insertOtp(userType: LoginUserType, userId: string, otp: number) {
    const query = `mutation InsertOtp($patient: uuid = null, $staff: uuid = null, $shAdmin: uuid = null, $otp: Int!, $expiryAt: timestamptz!) {
      insert_auth(objects: {patient: $patient, staff: $staff, otp: $otp, expiryAt: $expiryAt, shAdmin: $shAdmin}) {
        affected_rows
      }
    }`;

    // otp remains valid for 30 minutes
    const expiryAtMins = 30;
    const expiryAt = new Date(new Date().getTime() + 1000 * 60 * expiryAtMins).toISOString();

    try {
      await this.gqlService.client.request(query, {
        patient:
          userType === LoginUserType.PATIENT || userType === LoginUserType.BENCHMARK
            ? userId
            : null,
        staff: userType === LoginUserType.STAFF ? userId : null,
        shAdmin: userType === LoginUserType.SH_ADMIN ? userId : null,
        otp,
        expiryAt,
      });
    } catch (err) {
      this.logger.error('error while calling insertOtp' + JSON.stringify(err));
      throw new HttpException('insertOtp:Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  generateJwtToken(userType: LoginUserType, user: Patient | Staff | ShAdmin, jwtSecret?: string) {
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
      userType === LoginUserType.PATIENT
        ? LoginUserType.PATIENT
        : userType === LoginUserType.BENCHMARK
        ? LoginUserType.BENCHMARK
        : userType === LoginUserType.STAFF && user.type
        ? user.type
        : userType === LoginUserType.SH_ADMIN
        ? LoginUserType.SH_ADMIN
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

  addCustomJwtId(
    userType: LoginUserType,
    user: Patient | Staff | ShAdmin,
    jwtPayload: JwtPayload,
  ): JwtPayload {
    switch (userType) {
      case LoginUserType.SH_ADMIN:
        break;

      case LoginUserType.PATIENT:
      case LoginUserType.STAFF:
        jwtPayload['https://hasura.io/jwt/claims']['x-hasura-organization-id'] =
          user.organizationId;
        break;
    }
    return jwtPayload;
  }

  verifyToken(token: string, jwtSecret?: string): JwtPayload {
    if (!jwtSecret) {
      jwtSecret = this.configService.get('JWT_SECRET');
    }
    const key = JSON.parse(jwtSecret);
    try {
      const decodedToken = jwt.verify(token, key.key);
      return decodedToken as JwtPayload;
    } catch (error) {
      throw new HttpException('Invalid Token', HttpStatus.FORBIDDEN);
    }
  }

  verifyWsToken(authToken: string): boolean | JwtPayload {
    if (!authToken) {
      return false;
    }

    try {
      const payload = this.verifyToken(authToken);
      return payload;
    } catch (err) {
      this.logger.log(err);
      return false;
    }
  }
}
