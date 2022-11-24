import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { InviteOrganizationService } from 'src/services/organization/invite-organization/invite-organization.service';
import { EmailInviteBody } from './invite-organization.dto';

@Roles(UserRole.SH_ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('invite-organization')
@UseInterceptors(new TransformResponseInterceptor())
export class InviteOrganizationController {
  constructor(private inviteOrganizationService: InviteOrganizationService) {}

  @Get('generate-invite-code')
  async generateInviteUrl() {
    const inviteCode = await this.inviteOrganizationService.createOrganizationInviteCode();
    return { inviteCode };
  }

  @Post('send-email-invite')
  @HttpCode(200)
  async sendEmailInvite(@Body() body: EmailInviteBody) {
    const inviteCode = await this.inviteOrganizationService.createOrganizationInviteCode();
    await this.inviteOrganizationService.sendEmailInvite(body.email, inviteCode, body.redirectUrl);
    return {
      message: 'success',
    };
  }
}
