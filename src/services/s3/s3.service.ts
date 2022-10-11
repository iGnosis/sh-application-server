import { Injectable } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  public client: S3Client;
  public REGION: string;
  constructor(private configService: ConfigService) {
    this.REGION = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';
    this.client = new S3Client({
      region: this.REGION,
    });
  }

  async putObjectSignedUrl(bucketName: string, completeFilePath: string, expiryInSec = 3600) {
    // TODO: use infrequent S3 Storage class.
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: completeFilePath,
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    return await getSignedUrl(this.client, command, {
      expiresIn: expiryInSec,
    });
  }

  async getObjectedSignedUrl(bucketName: string, completeFilePath: string, expiryInSec = 3600) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: completeFilePath,
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    return await getSignedUrl(this.client, command, {
      expiresIn: expiryInSec,
    });
  }
}
