import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as fs from 'fs/promises';
import { join } from 'path';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/types/enum';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { UploadOrganizationService } from 'src/services/organization/upload/upload-organization.service';
import { RbacService } from 'src/services/rbac/rbac.service';

@Controller('rbac')
@ApiBearerAuth('access-token')
@UseInterceptors(new TransformResponseInterceptor())
export class RbacController {
  constructor(
    private rbacService: RbacService,
    private uploadOrganizationService: UploadOrganizationService,
  ) {}

  @Get()
  async exportRbacPermissions(@User('role') userRole: UserRole, @User('orgId') orgId: string) {
    const downloadsDir = join(process.cwd(), 'storage/hasura-metadata');
    const userRoleRbacFilePath = join(downloadsDir, `${userRole}.json`);

    const dirContents = await fs.readdir(downloadsDir);
    if (dirContents.includes(userRoleRbacFilePath)) {
      const rawData = await fs.readFile(userRoleRbacFilePath, { encoding: 'utf-8' });
      return JSON.parse(rawData);
    }

    const hasuraMetadata = await this.rbacService.exportHasuraMetadata();
    const filteredHasuraMetadata = this.rbacService.filterHasuraMetadata(hasuraMetadata, userRole);

    const orgConfig = (await this.uploadOrganizationService.getOrganization(orgId)).configuration;
    let uiRbac: any = {};
    if (orgConfig && orgConfig.uiRbac) {
      uiRbac = orgConfig.uiRbac;
    }

    const permissions = {
      hasuraRbac: filteredHasuraMetadata,
      uiRbac,
    };

    await fs.writeFile(userRoleRbacFilePath, JSON.stringify(permissions), { encoding: 'utf-8' });

    return permissions;
  }
}
