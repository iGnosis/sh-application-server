import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(private readonly logger: Logger) {
    this.logger = new Logger(AppService.name);
  }

  ping(): string {
    return 'success';
  }
}
