import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { UploadOrganizationService } from 'src/services/organization/upload/upload-organization.service';
import { RbacService } from 'src/services/rbac/rbac.service';

@Controller('rbac')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@UseInterceptors(new TransformResponseInterceptor())
export class RbacController {
  constructor(
    private rbacService: RbacService,
    private uploadOrganizationService: UploadOrganizationService,
  ) {}

  @Roles(UserRole.ORG_ADMIN, UserRole.THERAPIST, UserRole.PATIENT, UserRole.SH_ADMIN)
  @Get()
  async exportRbacPermissions(@User('role') userRole: UserRole, @User('orgId') orgId: string) {
    const downloadsDir = join(process.cwd(), 'storage/hasura-metadata');
    const fileName = `${userRole}.json`;
    const filePath = join(downloadsDir, fileName);

    const dirContents = await fs.readdir(downloadsDir);
    if (dirContents.includes(fileName)) {
      const rawData = await fs.readFile(filePath, { encoding: 'utf-8' });
      return JSON.parse(rawData);
    }

    const hasuraMetadata = await this.rbacService.exportHasuraMetadata();
    const filteredHasuraMetadata = this.rbacService.filterHasuraMetadata(hasuraMetadata, userRole);

    const orgConfig = (await this.uploadOrganizationService.getOrganization(orgId)).configuration;
    let uiRbac: any = {};
    if (orgConfig && orgConfig.uiRbac && Object.keys(orgConfig.uiRbac).includes(userRole)) {
      uiRbac = orgConfig.uiRbac[userRole];
    }

    const permissions = {
      hasuraRbac: filteredHasuraMetadata,
      uiRbac,
    };

    await fs.writeFile(filePath, JSON.stringify(permissions), { encoding: 'utf-8' });
    return permissions;
  }
}
