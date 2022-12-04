import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrgId } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { UploadOrganizationService } from 'src/services/organization/upload/upload-organization.service';

@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@UseInterceptors(new TransformResponseInterceptor())
@Controller('upload')
export class UploadOrganizationController {
  private BUCKET_NAME = 'organizations-data';

  constructor(
    private uploadOrganizationService: UploadOrganizationService,
    private s3Service: S3Service,
  ) {}

  @Roles(UserRole.ORG_ADMIN)
  @Get('/organization/logo')
  async getOrgLogoUploadUrl(@OrgId() orgId: string) {
    const orgObj = await this.uploadOrganizationService.getOrganization(orgId);
    const uploadUrl = await this.s3Service.putObjectSignedUrl(
      this.BUCKET_NAME,
      `${orgObj.name}/assets/logo`,
    );

    const logoAccessUrl = `https://organizations-data.s3.amazonaws.com/${orgObj.name}/assets/logo`;
    await this.uploadOrganizationService.updateLogoUrl(orgObj.id, logoAccessUrl);

    return { uploadUrl, logoAccessUrl };
  }
}
