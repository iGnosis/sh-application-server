import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserRole } from 'src/common/enums/enum';
import { GqlService } from 'src/services/clients/gql/gql.service';

@Injectable()
export class CreateOrganizationService {
  constructor(private gqlService: GqlService, private readonly logger: Logger) {}

  async isPatientUnique(
    orgId: string,
    phoneNumber: string,
    phoneCountryCode: string,
    email: string,
  ) {
    const isUniqEmail = `query IsUniqEmail($orgId: uuid!, $email: String!) {
      patient(where: {_and: {organizationId: {_eq: $orgId}, email: {_eq: $email}}}) {
        id
      }
    }`;

    const isUniqPhone = `query IsUniqPhone($orgId: uuid!, $phoneCountryCode: String!, $phoneNumber: String!) {
      patient(where: {_and: {organizationId: {_eq: $orgId}, phoneCountryCode: {_eq: $phoneCountryCode}, phoneNumber: {_eq: $phoneNumber}}}) {
        id
      }
    }`;

    const [uniqEmailResp, uniqPhoneResp] = await Promise.all([
      this.gqlService.client.request(isUniqEmail, { orgId, email }),
      this.gqlService.client.request(isUniqPhone, { orgId, phoneCountryCode, phoneNumber }),
    ]);

    if (uniqEmailResp.patient.length !== 0) {
      throw new HttpException('Email address already taken', HttpStatus.BAD_REQUEST);
    }

    if (uniqPhoneResp.patient.length !== 0) {
      throw new HttpException('Phone number already taken', HttpStatus.BAD_REQUEST);
    }

    return true;
  }

  async verifyOrgInviteCode(inviteCode: string): Promise<{
    id: string;
    organizationId: string;
    createdAt: Date;
    expiryAt: Date;
    inviteCode: string;
    maxUseCount: number;
  }> {
    const query = `query GetInviteCode($inviteCode: uuid!) {
      invite_organization(where: {inviteCode: {_eq: $inviteCode}}) {
        id
        organizationId
        createdAt
        expiryAt
        inviteCode
        maxUseCount
      }
    }`;

    const resp = await this.gqlService.client.request(query, { inviteCode });
    if (
      !resp ||
      !resp.invite_organization ||
      !Array.isArray(resp.invite_organization) ||
      !resp.invite_organization.length
    ) {
      this.logger.log(JSON.stringify(resp));
      throw new HttpException('Invalid invite code', HttpStatus.UNAUTHORIZED);
    }
    return resp.invite_organization[0];
  }

  async createOrganizationAdmin(
    organizationId: string,
    phoneNumber: string,
    phoneCountryCode: string,
    email: string,
  ) {
    const query = `mutation CreateOrganizationAdmin($phoneCountryCode: String!, $phoneNumber: String!, $type: user_type_enum!, $organizationId: uuid!, $email: String!) {
      insert_staff_one(object: {phoneCountryCode: $phoneCountryCode, phoneNumber: $phoneNumber, type: $type, organizationId: $organizationId, email: $email}) {
        id
      }
    }`;
    const resp = await this.gqlService.client.request(query, {
      phoneCountryCode,
      phoneNumber,
      organizationId,
      email,
      type: 'org_admin',
    });
    if (!resp || !resp.insert_staff_one || !resp.insert_staff_one.id) {
      this.logger.error(JSON.stringify(resp));
      throw new HttpException(
        '[createOrganizationAdmin] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async decremenOrgMaxUseCount(maxUseCount: number, inviteId: string) {
    const query = `mutation DecrementMaxUseCount($maxUseCount: Int!, $inviteId: uuid!) {
      update_invite_organization_by_pk(_set: {maxUseCount: $maxUseCount}, pk_columns: {id: $inviteId}) {
        id
      }
    }`;
    const resp = await this.gqlService.client.request(query, { maxUseCount, inviteId });
    if (
      !resp ||
      !resp.update_invite_organization_by_pk ||
      !resp.update_invite_organization_by_pk.id
    ) {
      this.logger.error(JSON.stringify(resp));
      throw new HttpException(
        '[decremenOrgMaxUseCount] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async decremenUserMaxUseCount(maxUseCount: number, inviteId: string) {
    const query = `mutation DecrementMaxUseCount($maxUseCount: Int!, $inviteId: uuid!) {
      update_invite_user_by_pk(_set: {maxUseCount: $maxUseCount}, pk_columns: {id: $inviteId}) {
        id
      }
    }`;
    const resp = await this.gqlService.client.request(query, { maxUseCount, inviteId });
    if (!resp || !resp.update_invite_user_by_pk || !resp.update_invite_user_by_pk.id) {
      this.logger.error(JSON.stringify(resp));
      throw new HttpException(
        '[decremenUserMaxUseCount] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyUserInviteCode(inviteCode: string): Promise<{
    id: string;
    createdAt: Date;
    expiryAt: Date;
    inviteCode: string;
    maxUseCount: number;
    organizationId: string;
    type: UserRole;
  }> {
    const query = `query LookUpUserInviteCode($inviteCode: uuid!) {
      invite_user(where: {inviteCode: {_eq: $inviteCode}}) {
        id
        organizationId
        createdAt
        expiryAt
        inviteCode
        maxUseCount
        type
      }
    }`;
    const resp = await this.gqlService.client.request(query, { inviteCode });
    if (
      !resp ||
      !resp.invite_user ||
      !Array.isArray(resp.invite_user) ||
      !resp.invite_user.length
    ) {
      this.logger.log(JSON.stringify(resp));
      throw new HttpException('Invalid invite code', HttpStatus.FORBIDDEN);
    }

    return resp.invite_user[0];
  }
}
