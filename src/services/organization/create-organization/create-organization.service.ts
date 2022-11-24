import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GqlService } from 'src/services/clients/gql/gql.service';

@Injectable()
export class CreateOrganizationService {
  constructor(private gqlService: GqlService, private readonly logger: Logger) {}

  async verifyInviteCode(inviteCode: string): Promise<{
    id: string;
    createdAt: Date;
    expiryAt: Date;
    inviteCode: string;
    maxUseCount: number;
  }> {
    const query = `query GetInviteCode($inviteCode: uuid!) {
      invite_organization(where: {inviteCode: {_eq: $inviteCode}}) {
        id
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
      this.logger.error(JSON.stringify(resp));
      throw new HttpException(
        '[verifyInviteCode] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return resp.invite_organization[0];
  }

  async createOrganization(name: string, type: string): Promise<string> {
    const query = `mutation InsertOrganization($name: String!, $type: organization_type_enum!) {
      insert_organization_one(object: {name: $name, type: $type}) {
        id
      }
    }`;
    const resp = await this.gqlService.client.request(query, { name, type });
    if (!resp || !resp.insert_organization_one || !resp.insert_organization_one.id) {
      this.logger.error(JSON.stringify(resp));
      throw new HttpException('[insertOrg] Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return resp.insert_organization_one.id;
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

  async decrementMaxUseCount(maxUseCount: number, inviteId: string) {
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
        '[decrementMaxUseCount] Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
