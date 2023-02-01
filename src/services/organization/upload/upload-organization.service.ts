import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GqlService } from 'src/services/clients/gql/gql.service';
import { Organization } from 'src/types/global';

@Injectable()
export class UploadOrganizationService {
  constructor(private gqlService: GqlService) {}

  async getOrganization(orgId: string): Promise<Organization> {
    const query = `query GetOrganization($orgId: uuid!) {
      organization_by_pk(id: $orgId) {
        id
        createdAt
        updatedAt
        name
        type
        patientDomain
        organizationDomain
        configuration
        logoUrl
      }
    }`;

    const resp = await this.gqlService.client.request(query, { orgId });
    if (!resp || !resp.organization_by_pk) {
      throw new HttpException('Organization does not exist', HttpStatus.BAD_REQUEST);
    }
    return resp.organization_by_pk;
  }

  async updateLogoUrl(orgId: string, logoUrl: string) {
    const query = `mutation UpdateLogoUrl($orgId: uuid!, $logoUrl: String!) {
      update_organization_by_pk(pk_columns: {id: $orgId}, _set: {logoUrl: $logoUrl}) {
        id
      }
    }`;
    await this.gqlService.client.request(query, { orgId, logoUrl });
  }
}
