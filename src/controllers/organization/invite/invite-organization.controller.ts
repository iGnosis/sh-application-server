import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { isEmail } from 'class-validator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/types/enum';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { CreateOrganizationService } from 'src/services/organization/create/create-organization.service';
import { InviteOrganizationService } from 'src/services/organization/invite/invite-organization.service';
import { UploadOrganizationService } from 'src/services/organization/upload/upload-organization.service';
import { EmailInviteBody } from './invite-organization.dto';

@ApiBearerAuth('access-token')
@Controller('invite')
@UseInterceptors(new TransformResponseInterceptor())
export class InviteOrganizationController {
  constructor(
    private inviteOrganizationService: InviteOrganizationService,
    private createOrganizationService: CreateOrganizationService,
    private uploadOrganizationService: UploadOrganizationService,
  ) {}

  @Post('organization/email')
  @HttpCode(200)
  async sendEmailInvite(@Body() body: EmailInviteBody) {
    const { organizationId } = await this.createOrganizationService.verifyOrgInviteCode(
      body.inviteCode,
    );
    const { organizationDomain } = await this.uploadOrganizationService.getOrganization(
      organizationId,
    );
    await this.inviteOrganizationService.sendEmailInvite(
      body.email,
      `https://${organizationDomain}?inviteCode=${body.inviteCode}`,
    );
    return {
      message: 'success',
    };
  }

  @Get('patient')
  async generatePatientInviteCode(
    @User('orgId') orgId: string,
    @Query('shouldSendEmail') shouldSendEmail?: boolean,
    @Query('email') email?: string,
  ) {
    // by default, the Patient invite code will never expire
    const maxUseCount = -1;
    const inviteCode = await this.inviteOrganizationService.createUserInviteCode(
      orgId,
      maxUseCount,
      UserRole.PATIENT,
    );

    const { organizationDomain } = await this.uploadOrganizationService.getOrganization(orgId);
    if (shouldSendEmail && email && isEmail(email)) {
      this.inviteOrganizationService.sendEmailInvite(
        email,
        `https://${organizationDomain}/invite/patient?inviteCode=${inviteCode}`,
      );
    }

    return { inviteCode };
  }

  @Get('staff')
  async generateStaffInviteCode(
    @User('orgId') orgId: string,
    @Query('staffType') staffType: UserRole,
    @Query('shouldSendEmail') shouldSendEmail?: boolean,
    @Query('email') email?: string,
  ) {
    const allowedStaffRoles = [UserRole.ORG_ADMIN, UserRole.THERAPIST];
    if (!allowedStaffRoles.includes(staffType)) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // by default, the Staff invite code will be one-time use
    const maxUseCount = 1;
    const inviteCode = await this.inviteOrganizationService.createUserInviteCode(
      orgId,
      maxUseCount,
      staffType,
    );

    const { organizationDomain } = await this.uploadOrganizationService.getOrganization(orgId);
    if (shouldSendEmail && email && isEmail(email)) {
      await this.inviteOrganizationService.sendEmailInvite(
        email,
        `https://${organizationDomain}/invite/staff?inviteCode=${inviteCode}`,
      );
    }

    return { inviteCode };
  }
}
