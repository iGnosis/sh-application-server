import { Body, Controller, HttpException, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { CreateOrganizationService } from 'src/services/organization/create/create-organization.service';
import { SmsAuthService } from 'src/services/sms-auth/sms-auth.service';
import { Patient, Staff } from 'src/types/global';
import { CreatePatientBody, CreateStaffBody } from './create-organization.dto';

@Controller('create')
@UseInterceptors(new TransformResponseInterceptor())
export class CreateOrganizationController {
  constructor(
    private createOrganizationService: CreateOrganizationService,
    private smsAuthService: SmsAuthService,
  ) {}

  @Post('patient')
  async createPatient(@Body() body: CreatePatientBody) {
    console.log('createPatient:body: ', body);

    const inviteObj = await this.createOrganizationService.verifyUserInviteCode(body.inviteCode);

    const now = new Date();
    if (inviteObj.expiryAt && now >= inviteObj.expiryAt) {
      throw new HttpException('Unauthorized - Invite code has been expired', HttpStatus.FORBIDDEN);
    }

    // -1 == Infinity code re-use allowed
    if (inviteObj.maxUseCount !== -1 && inviteObj.maxUseCount <= 0) {
      throw new HttpException('Unauthorized - Out of quota', HttpStatus.FORBIDDEN);
    }

    // create an entry in `patient` table, also set proper
    const patient: Patient = {
      firstName: body.firstName,
      lastName: body.lastName,
      namePrefix: body.namePrefix,
      phoneCountryCode: body.phoneCountryCode,
      phoneNumber: body.phoneNumber,
      organizationId: inviteObj.organizationId,
      email: body.email,
    };

    await this.smsAuthService.insertPatient(patient);
    // TODO: Expiry the invite code (?)
    // TODO: register pinpoint endpoint for the Patient
    return { message: 'success' };
  }

  @Post('staff')
  async createStaff(@Body() body: CreateStaffBody) {
    const inviteObj = await this.createOrganizationService.verifyUserInviteCode(body.inviteCode);

    const now = new Date();
    if (inviteObj.expiryAt && now >= inviteObj.expiryAt) {
      throw new HttpException('Unauthorized - Invite code has been expired', HttpStatus.FORBIDDEN);
    }

    if (inviteObj.maxUseCount <= 0) {
      throw new HttpException('Unauthorized - Out of quota', HttpStatus.FORBIDDEN);
    }

    const staffObj: Staff = {
      organizationId: inviteObj.organizationId,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      type: inviteObj.type,
      phoneCountryCode: body.phoneCountryCode,
      phoneNumber: body.phoneNumber,
    };

    await this.smsAuthService.insertStaff(staffObj);

    inviteObj.maxUseCount = inviteObj.maxUseCount - 1;
    await this.createOrganizationService.decremenUserMaxUseCount(
      inviteObj.maxUseCount,
      inviteObj.id,
    );

    // TODO: register pinpoint endpoint for the Staff
    return { message: 'success' };
  }
}
