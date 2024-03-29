import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/transform-response.interceptor';
import { S3Service } from 'src/services/clients/s3/s3.service';
import { UploadOrganizationService } from 'src/services/organization/upload/upload-organization.service';

@ApiBearerAuth('access-token')
@UseInterceptors(new TransformResponseInterceptor())
@Controller('upload')
export class UploadOrganizationController {
  private BUCKET_NAME = 'organizations-data';

  constructor(
    private uploadOrganizationService: UploadOrganizationService,
    private s3Service: S3Service,
  ) {}

  @Get('/organization/logo')
  async getOrgLogoUploadUrl(@User('orgId') orgId: string) {
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
