import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StsService {
  private stsClient: STSClient;
  constructor(private configService: ConfigService) {
    this.stsClient = new STSClient({
      region: configService.get('AWS_DEFAULT_REGION') || 'us-east-1',
    });
  }

  async putObjStsAssumeRole(bucket: string, filePath: string) {
    const policy = `{
        "Version": "2012-10-17",
        "Statement": [
          {
              "Sid": "TestersVideo",
              "Effect": "Allow",
              "Action": [
                  "s3:PutObject",
                  "s3:GetObject"
              ],
              "Resource": "arn:aws:s3:::${bucket}/${filePath}/*"
          }
        ]
      }`;

    const data = await this.stsClient.send(
      new AssumeRoleCommand({
        RoleArn: 'arn:aws:iam::190179631339:role/testersWebClient',
        Policy: policy,
        RoleSessionName: 'testersWebClient',
        DurationSeconds: 3600, // valid for 1 hour.
      }),
    );

    return {
      ...data.Credentials,
    };
  }
}
