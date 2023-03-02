import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BuildVersion } from 'src/types/global';

@Controller('build-version')
export class BuildVersionController {
  constructor(private configService: ConfigService) {}

  @Get('')
  buildVersion() {
    const version = this.configService.get('BUILD_VERSION');
    const timestamp = this.configService.get('BUILD_TIMESTAMP');
    return {
      version,
      timestamp,
    };
  }
}
