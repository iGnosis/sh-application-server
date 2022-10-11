import { Injectable } from '@nestjs/common';
import {
  ElasticTranscoderClient,
  CancelJobCommand,
  CreateJobCommand,
} from '@aws-sdk/client-elastic-transcoder';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VideoTranscoderService {
  public REGION: string;
  public client: ElasticTranscoderClient;

  constructor(private configService: ConfigService) {
    this.REGION = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';
    this.client = new ElasticTranscoderClient({
      region: this.REGION,
    });
  }
}
