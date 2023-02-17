import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BuildVersion } from 'src/types/global';

@Controller('build-version')
export class BuildVersionController {
  constructor(private configService: ConfigService) {}

  @Get('')
  buildVersion() {
    const buildVersion = JSON.parse(
      this.configService.get('BUILD_VERSION') || '{}',
    ) as BuildVersion;
    return buildVersion;
  }
}
