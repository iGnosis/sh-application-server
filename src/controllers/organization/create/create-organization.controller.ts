import { Body, Controller, HttpException, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { CreateOrganizationService } from 'src/services/organization/create-organization/create-organization.service';
import { CreateOrganizationBody } from './create-organization.dto';

@Controller('create-organization')
@UseInterceptors(new TransformResponseInterceptor())
export class CreateOrganizationController {
  constructor(private createOrganizationService: CreateOrganizationService) {}

  @Post()
  async createOrganization(@Body() body: CreateOrganizationBody) {
    const inviteObj = await this.createOrganizationService.verifyInviteCode(body.inviteCode);

    if (inviteObj.maxUseCount <= 0) {
      throw new HttpException('Out of quota to create an org', HttpStatus.FORBIDDEN);
    }

    const orgId = await this.createOrganizationService.createOrganization(
      body.orgDetails.name,
      body.orgDetails.type,
    );

    const { email, phoneCountryCode, phoneNumber } = body.adminDetails;
    await this.createOrganizationService.createOrganizationAdmin(
      orgId,
      phoneNumber,
      phoneCountryCode,
      email,
    );

    const decrementCount = inviteObj.maxUseCount - 1;
    await this.createOrganizationService.decrementMaxUseCount(decrementCount, inviteObj.id);

    return {
      message: 'success',
    };
  }
}
