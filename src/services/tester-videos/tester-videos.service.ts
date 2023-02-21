import { Injectable } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';

@Injectable()
export class TesterVideosService {
  constructor(private gqlService: GqlService) {}

  async getRecording(recordingId: string): Promise<{
    id: string;
    createdAt: Date;
    endedAt: Date;
    patient: string;
    videoKey: string;
    configKey: string;
    organization: string;
  }> {
    const query = `query GetRecording($recordingId: uuid!) {
      tester_videos_by_pk(id: $recordingId) {
        id
        createdAt
        endedAt
        patient
        videoKey
        configKey
        organization
      }
    }`;
    const resp = await this.gqlService.client.request(query, { recordingId });
    return resp.tester_videos_by_pk;
  }
}
