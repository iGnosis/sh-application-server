import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITriggerPayload, Novu } from '@novu/node';

@Injectable()
export class NovuService {
  public novuClient: Novu;
  private novuApiKey: string;
  private novuBackendUrl: string;

  constructor(private configService: ConfigService) {
    this.novuApiKey = this.configService.get('NOVU_API_KEY');
    this.novuBackendUrl = this.configService.get('NOVU_BACKEND_URL');
    this.novuClient = new Novu(this.novuApiKey, {
      backendUrl: this.novuBackendUrl,
    });
  }
}
