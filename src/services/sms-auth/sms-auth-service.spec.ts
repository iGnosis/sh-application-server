import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from 'src/common/enums/role.enum';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { SmsService } from 'src/services/clients/sms/sms.service';
import { Staff, Patient } from 'src/types/global';
import { EmailService } from '../clients/email/email.service';
import { SmsAuthService } from './sms-auth.service';

jest.mock('src/services/clients/sms/sms.service');

describe('SmsAuthService', () => {
  let service: SmsAuthService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsAuthService, GqlService, ConfigService, SmsService, EmailService, Logger],
    }).compile();
    service = module.get<SmsAuthService>(SmsAuthService);
  });

  it('should generate 6 digit OTP', () => {
    // given
    const validOtpLength = 6;

    // when
    const otp = service.generateOtp();

    // then
    expect(typeof otp).toBe('number');
    expect(otp.toString()).toHaveLength(validOtpLength);
  });

  it('should detect expired OTP issued at', () => {
    // given
    // otp remains valid for 30 minutes.
    const msInHalfHour = 31 * 60 * 1000;
    const issuedAt = new Date(new Date().getTime() - msInHalfHour);

    // when
    const isExpired = service.isOtpExpired(issuedAt);

    // then
    expect(isExpired).toBe(true);
  });

  it('should verify valid OTP issued at', () => {
    // given
    const msIn15Mins = 15 * 60 * 1000;
    const issuedAt = new Date(new Date().getTime() + msIn15Mins);

    // when
    const isExpired = service.isOtpExpired(issuedAt);

    // then
    expect(isExpired).toBe(false);
  });

  // TODO: Look into parameterizing tests.
  it('should generate a valid patient JWT token', () => {
    // given
    const userType = UserRole.PATIENT;
    const userObj = {
      id: 'patient-abc',
    };
    const testJwtSecret = '{"type":"HS256","key":"test_jwt_secret"}';

    // when
    const jwt = service.generateJwtToken(userType, userObj as Patient, testJwtSecret);
    const verifiedToken = service.verifyToken(jwt, testJwtSecret);

    // then
    expect(typeof jwt).toBe('string');
    expect(verifiedToken).toBeDefined();
    expect(verifiedToken).toHaveProperty('id', userObj.id);
    expect(verifiedToken).toHaveProperty('iat');
    expect(verifiedToken).toHaveProperty('exp');
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty('x-hasura-allowed-roles', [
      'patient',
    ]);
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty(
      'x-hasura-default-role',
      userType,
    );
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty(
      'x-hasura-user-id',
      userObj.id,
    );
  });

  it('should generate a valid therapist JWT token', () => {
    // given
    const userType = UserRole.THERAPIST;
    const userObj = {
      id: 'therapist-abc',
    };
    const testJwtSecret = '{"type":"HS256","key":"test_jwt_secret"}';

    // when
    const jwt = service.generateJwtToken(userType, userObj as Staff, testJwtSecret);
    const verifiedToken = service.verifyToken(jwt, testJwtSecret);

    // then
    expect(typeof jwt).toBe('string');
    expect(verifiedToken).toBeDefined();
    expect(verifiedToken).toHaveProperty('id', userObj.id);
    expect(verifiedToken).toHaveProperty('iat');
    expect(verifiedToken).toHaveProperty('exp');
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty('x-hasura-allowed-roles', [
      'therapist',
    ]);
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty(
      'x-hasura-default-role',
      userType,
    );
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty(
      'x-hasura-user-id',
      userObj.id,
    );
  });

  it('should generate a valid benchmark JWT token', () => {
    // given
    const userType = UserRole.BENCHMARK;
    const userObj = {
      id: 'benchmark-abc',
    };
    const testJwtSecret = '{"type":"HS256","key":"test_jwt_secret"}';

    // when
    const jwt = service.generateJwtToken(userType, userObj as Staff, testJwtSecret);
    const verifiedToken = service.verifyToken(jwt, testJwtSecret);

    // then
    expect(typeof jwt).toBe('string');
    expect(verifiedToken).toBeDefined();
    expect(verifiedToken).toHaveProperty('id', userObj.id);
    expect(verifiedToken).toHaveProperty('iat');
    expect(verifiedToken).toHaveProperty('exp');
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty('x-hasura-allowed-roles', [
      'benchmark',
    ]);
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty(
      'x-hasura-default-role',
      userType,
    );
    expect(verifiedToken['https://hasura.io/jwt/claims']).toHaveProperty(
      'x-hasura-user-id',
      userObj.id,
    );
  });
});
