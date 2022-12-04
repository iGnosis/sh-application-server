import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserRole } from 'src/common/enums/role.enum';
import { EmailService } from 'src/services/clients/email/email.service';
import { GqlService } from 'src/services/clients/gql/gql.service';

@Injectable()
export class InviteOrganizationService {
  constructor(
    private gqlService: GqlService,
    private emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  async createOrganizationInviteCode(): Promise<string> {
    const query = `mutation InviteOrganization($maxUseCount: Int = 1) {
      insert_invite_organization_one(object: {maxUseCount: $maxUseCount}) {
        inviteCode
      }
    }`;

    // by default, the invite code can be used just once.
    const resp = await this.gqlService.client.request(query, { maxUseCount: 1 });

    if (
      !resp ||
      !resp.insert_invite_organization_one ||
      !resp.insert_invite_organization_one.inviteCode
    ) {
      this.logger.error(JSON.stringify(resp));
      throw new HttpException(
        '[createOrganizationInvite] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return resp.insert_invite_organization_one.inviteCode;
  }

  async sendEmailInvite(email: string, inviteCode: string, redirectUrl: string) {
    await this.emailService.send({
      to: [email],
      subject: 'An invite from Pointmotion!',
      text: '',
      body: `Please click on ${redirectUrl}?inviteCode=${inviteCode} to create an account!`,
    });
    return true;
  }

  async createUserInviteCode(
    organizationId: string,
    maxUseCount: number,
    userRole: UserRole,
  ): Promise<string> {
    const query = `mutation GenerateUserInviteCode($organizationId: uuid!, $maxUseCount: Int!, $userRole: user_type_enum!) {
      insert_invite_user_one(object: {organizationId: $organizationId, maxUseCount: $maxUseCount, type: $userRole}) {
        inviteCode
      }
    }`;
    const resp = await this.gqlService.client.request(query, {
      organizationId,
      maxUseCount,
      userRole,
    });

    if (!resp || !resp.insert_invite_user_one || !resp.insert_invite_user_one.inviteCode) {
      this.logger.error(JSON.stringify(resp));
      throw new HttpException(
        '[createUserInviteCode] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return resp.insert_invite_user_one.inviteCode;
  }
}
