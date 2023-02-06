import { Injectable } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3CompletedParts } from 'src/types/global';

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

  async deleteObject(bucket: string, key: string) {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await this.client.send(command);
  }

  async createMultipartUpload(bucket: string, key: string) {
    const command = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
    });
    return await this.client.send(command);
  }

  async uploadPart(bucket: string, key: string, uploadId: string, partNumber: number, chunk: Blob) {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: chunk,
    });
    return await this.client.send(command);
  }

  async completePartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: S3CompletedParts[],
  ) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });
    return await this.client.send(command);
  }

  async putObjectSignedUrl(
    bucketName: string,
    completeFilePath: string,
    contentType?: string,
    expiryInSec = 3600,
    StorageClass = 'STANDARD_IA',
  ) {
    const commandInput: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: completeFilePath,
      StorageClass,
    };

    if (contentType) {
      commandInput.ContentType = contentType;
    }

    const command = new PutObjectCommand(commandInput);

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
