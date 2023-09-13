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
import { Staff, Patient, ShAdmin, NovuSubscriberData } from 'src/types/global';
import { SMSLoginBody, SMSVerifyBody } from './sms-auth.dto';
import { SmsAuthService } from '../../services/sms-auth/sms-auth.service';
import { UserRole, LoginUserType } from 'src/types/enum';
import { CreateOrganizationService } from 'src/services/organization/create/create-organization.service';
import { NovuService } from 'src/services/novu/novu.service';
import { StripeService } from 'src/services/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';

// TODO: Apply rate limiters (?)
@UseInterceptors(new TransformResponseInterceptor())
@Controller('sms-auth')
export class SmsAuthController {
  constructor(
    private smsAuthService: SmsAuthService,
    private createOrganizationService: CreateOrganizationService,
    private readonly logger: Logger,
    private novuService: NovuService,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(SmsAuthController.name);
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: SMSLoginBody,
    @Headers('x-pointmotion-user-type') userType: LoginUserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    // SH ADMIN does not require a Organization.
    if (userType !== LoginUserType.SH_ADMIN && !orgName) {
      throw new HttpException('Org name missing', HttpStatus.BAD_REQUEST);
    }

    const organization = await this.smsAuthService.getOrganization(orgName);
    if (!organization) {
      throw new HttpException('Org does not exist', HttpStatus.BAD_REQUEST);
    }

    this.logger.log('organization:: ' + JSON.stringify(organization));

    if (
      !userType ||
      (userType !== LoginUserType.PATIENT &&
        userType !== LoginUserType.BENCHMARK &&
        userType !== LoginUserType.STAFF &&
        userType !== LoginUserType.SH_ADMIN)
    ) {
      throw new HttpException('Invalid userType', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;
    const otp = this.smsAuthService.generateOtp();
    let user: Patient | Staff | ShAdmin | undefined;

    // TODO: cap the org admin sign-ups
    if (body.inviteCode) {
      const inviteObj = await this.createOrganizationService.verifyOrgInviteCode(body.inviteCode);
      if (inviteObj.expiryAt && new Date() > inviteObj.expiryAt) {
        throw new HttpException('Expired invite code', HttpStatus.UNAUTHORIZED);
      }
      await this.smsAuthService.insertStaff({
        phoneCountryCode: body.phoneCountryCode,
        phoneNumber: body.phoneNumber,
        organizationId: inviteObj.organizationId,
        type: UserRole.ORG_ADMIN,
      });
    }

    if (userType === LoginUserType.PATIENT) {
      let user: Patient;
      user = await this.smsAuthService.fetchPatient(
        body.phoneCountryCode,
        body.phoneNumber,
        orgName,
        organization.id,
      );
      this.logger.log('fetchPatient:user: ' + JSON.stringify(user));

      // NOTE: some organization allows public patient sign-ups.
      if (!user && organization && !organization.isPublicSignUpEnabled) {
        throw new HttpException('Public sign-ups are disabled.', HttpStatus.UNAUTHORIZED);
      }

      if (!user && organization && organization.isPublicSignUpEnabled) {
        user = await this.smsAuthService.insertPatient({
          phoneCountryCode: body.phoneCountryCode,
          phoneNumber: body.phoneNumber,
          organizationId: organization.id,
          type: UserRole.PATIENT,
        });
      }

      this.logger.log('user:: ' + JSON.stringify(user));

      try {
        // check if Novu subscriber doesn't exist
        const subscriber = await this.novuService.getSubscriber(user.id);
        if (!subscriber || !subscriber.subscriberId) {
          let firstPaymentMade = false;
          if (user && user.customerId) {
            const invoicesList = await this.stripeService.stripeClient.invoices.list({
              customer: user.customerId,
              status: 'paid',
            });
            if (invoicesList.data.length >= 1) {
              firstPaymentMade = true;
            }
          }
          // create Novu subscriber for patients only.
          const novuData: Partial<NovuSubscriberData> = {
            ...subscriber.data,
            firstPaymentMade,
            organizationId: organization.id,
          };
          const newSubscriber = await this.novuService.createNewSubscriber(
            user.id,
            phoneCountryCode,
            phoneNumber,
            user.email,
            novuData,
          );
          this.logger.log('createNewSubscriber:newSubscriber' + JSON.stringify(newSubscriber));
        }
        await this.novuService.triggerCalendarNotification(user.id);
      } catch (err) {
        this.logger.error('error while creating novu sub:: ' + JSON.stringify(err));
      }

      this.logger.log('insertOtp::user.id::' + user.id);
      await this.smsAuthService.insertOtp(userType, user.id, otp);

      try {
        await this.smsAuthService.sendOtp(phoneCountryCode, phoneNumber, otp);
        if (user && user.email) {
          this.logger.log(`sending Login OTP email to ${user.email}`);
          await this.smsAuthService.sendOtpEmail(user.email, otp);
        }
        return {
          message: 'OTP sent successfully.',
          isExistingUser: user && user.email ? true : false,
        };
      } catch (err) {
        console.log('error while sending OTP: ' + JSON.stringify(err));
        if (
          !this.configService.get('APP_TWILIO_ACCOUNT_SID') ||
          !this.configService.get('APP_TWILIO_AUTH_TOKEN')
        ) {
          return {
            message: `twilio mock:otp:${otp}`,
            isExistingUser: user && user.email ? true : false,
          };
        }
      }
    }

    if (userType === LoginUserType.SH_ADMIN) {
      user = await this.smsAuthService.fetchShAdmin(phoneCountryCode, phoneNumber);
    } else if (userType === LoginUserType.STAFF) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    } else if (userType === LoginUserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(
        phoneCountryCode,
        phoneNumber,
        orgName,
        organization.id,
      );
      if (!user || !user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    if (!user) {
      throw new HttpException(
        {
          msg: 'Unauthorized',
          reason: 'Account does not exist. Please ask your provider to create an account for you.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.smsAuthService.insertOtp(userType, user.id, otp);
    if (
      !this.configService.get('APP_TWILIO_ACCOUNT_SID') ||
      !this.configService.get('APP_TWILIO_AUTH_TOKEN')
    ) {
      return {
        message: `twilio mock:otp:${otp}`,
        isExistingUser: user && user.email ? true : false,
      };
    }

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
    @Headers('x-pointmotion-user-type') userType: LoginUserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    // SH ADMIN does not require a Organization.
    if (userType !== LoginUserType.SH_ADMIN && !orgName) {
      throw new HttpException('Org name missing', HttpStatus.BAD_REQUEST);
    }

    const organization = await this.smsAuthService.getOrganization(orgName);
    if (!organization) {
      throw new HttpException('Org does not exist', HttpStatus.BAD_REQUEST);
    }
    this.logger.log('organization:: ' + JSON.stringify(organization));

    if (
      !userType ||
      (userType !== LoginUserType.PATIENT &&
        userType !== LoginUserType.BENCHMARK &&
        userType !== LoginUserType.STAFF &&
        userType !== LoginUserType.SH_ADMIN)
    ) {
      throw new HttpException('Invalid userType', HttpStatus.BAD_REQUEST);
    }

    const { phoneCountryCode, phoneNumber } = body;

    let user: Staff | Patient | ShAdmin;
    if (userType === LoginUserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(
        phoneCountryCode,
        phoneNumber,
        orgName,
        organization.id,
      );
    } else if (userType === LoginUserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(
        phoneCountryCode,
        phoneNumber,
        orgName,
        organization.id,
      );
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userType === LoginUserType.SH_ADMIN) {
      user = await this.smsAuthService.fetchShAdmin(phoneCountryCode, phoneNumber);
    } else if (userType === LoginUserType.STAFF) {
      // only the phone numbers added to the staff table should be allowed to enter the Organization portal.
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    }

    if (!user) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const auth = await this.smsAuthService.fetchLatestOtp(userType, user.id);
    const isOtpExpired = this.smsAuthService.isOtpExpired(auth.expiryAt);
    const otp = isOtpExpired ? this.smsAuthService.generateOtp() : auth.otp;

    if (isOtpExpired) {
      await this.smsAuthService.insertOtp(userType, user.id, otp);
    }

    if (
      !this.configService.get('APP_TWILIO_ACCOUNT_SID') ||
      !this.configService.get('APP_TWILIO_AUTH_TOKEN')
    ) {
      return {
        message: `twilio mock:otp:${otp}`,
        isExistingUser: user && user.email ? true : false,
      };
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
    @Headers('x-pointmotion-user-type') userType: LoginUserType,
    @Headers('x-organization-name') orgName: string,
  ) {
    // SH ADMIN does not require a Organization.
    if (userType !== LoginUserType.SH_ADMIN && !orgName) {
      throw new HttpException('Org name missing', HttpStatus.BAD_REQUEST);
    }

    const organization = await this.smsAuthService.getOrganization(orgName);
    if (!organization) {
      throw new HttpException('Org does not exist', HttpStatus.BAD_REQUEST);
    }
    this.logger.log('organization:: ' + JSON.stringify(organization));

    if (
      !userType ||
      (userType !== LoginUserType.PATIENT &&
        userType !== LoginUserType.BENCHMARK &&
        userType !== LoginUserType.STAFF &&
        userType !== LoginUserType.SH_ADMIN)
    ) {
      throw new HttpException('Invalid userType', HttpStatus.BAD_REQUEST);
    }

    const { otp: recievedOtp, phoneCountryCode, phoneNumber } = body;
    let user: Staff | Patient | ShAdmin;

    if (userType === LoginUserType.PATIENT) {
      user = await this.smsAuthService.fetchPatient(
        phoneCountryCode,
        phoneNumber,
        orgName,
        organization.id,
      );
    } else if (userType === LoginUserType.BENCHMARK) {
      user = await this.smsAuthService.fetchPatient(
        phoneCountryCode,
        phoneNumber,
        orgName,
        organization.id,
      );
      if (!user.canBenchmark) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else if (userType === LoginUserType.SH_ADMIN) {
      user = await this.smsAuthService.fetchShAdmin(phoneCountryCode, phoneNumber);
    } else if (userType === LoginUserType.STAFF) {
      user = await this.smsAuthService.fetchStaff(phoneCountryCode, phoneNumber, orgName);
    }

    if (!user) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    console.log('user::', user);
    const auth = await this.smsAuthService.fetchLatestOtp(userType, user.id);
    const isExpired = this.smsAuthService.isOtpExpired(auth.expiryAt);

    if (isExpired || recievedOtp !== auth.otp) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // so that the same OTP can't be used twice.
    const tempOtp = this.smsAuthService.generateOtp();
    await this.smsAuthService.insertOtp(userType, user.id, tempOtp);

    const token = this.smsAuthService.generateJwtToken(userType, user);
    return { token };
  }
}
